import WinGoRound from "../models/WinGoRound.js";
import WinGoBet from "../models/WinGoBet.js";
import User from "../models/User.js";
import { logErrorToDbAsync } from "../utils/logErrorToDb.js";
import { getOutcomeFromDigit, calculateBetPayout } from "../utils/winGoRules.js";
import { BIG_SMALL_MAP, WINGO_GAMES, DRAW_DURATION_MS } from "../constants/winGoConstants.js";
import { getRoundWindow } from "../utils/winGoRoundWindow.js";

const TICK_INTERVAL_MS = 1000;
const STALE_ROUND_MS = 30_000; // recover rounds stuck longer than 30 s
let tickInProgress = false;

/* ============================================================
   SETTLE A SINGLE ROUND
   Handles both "processing" and "closed" states so it can
   resume after a crash at any point in the pipeline.
============================================================ */
async function settleRound(roundId) {
  try {
    const round = await WinGoRound.findById(roundId);
    if (!round) return;
    if (round.status === "settled") return;
    if (round.status !== "processing" && round.status !== "closed") return;

    // 1. Determine winning digit (idempotent — reuses existing outcome)
    const winningDigit =
      typeof round.outcomeNumber === "number" &&
      round.outcomeNumber >= 0 &&
      round.outcomeNumber <= 9
        ? round.outcomeNumber
        : Math.floor(Math.random() * 10);

    const { bigSmall, color } = getOutcomeFromDigit(winningDigit);

    // 2. Persist outcome → move to "closed" (skip if already closed)
    if (round.status === "processing") {
      await WinGoRound.updateOne(
        { _id: round._id },
        {
          $set: {
            outcomeNumber: winningDigit,
            outcomeBigSmall:
              bigSmall === "big" ? BIG_SMALL_MAP.BIG : BIG_SMALL_MAP.SMALL,
            outcomeColor: color,
            status: "closed",
          },
        }
      );
    }

    // 3. Evaluate every bet on this round (idempotent — $set overwrites)
    const bets = await WinGoBet.find({ round: round._id });

    const bulkBetOps = [];
    const userIncrementMap = new Map();

    for (const bet of bets) {
      try {
        const { isWin, payoutAmount } = calculateBetPayout(bet, winningDigit);

        bulkBetOps.push({
          updateOne: {
            filter: { _id: bet._id },
            update: { $set: { isWin, payoutAmount } },
          },
        });

        if (isWin && payoutAmount > 0) {
          const current = userIncrementMap.get(bet.user.toString()) || 0;
          userIncrementMap.set(bet.user.toString(), current + payoutAmount);
        }
      } catch (betErr) {
        console.error("WinGo settlement skipping invalid bet", bet._id, betErr.message);
        logErrorToDbAsync(betErr, {
          source: "winGoScheduler",
          context: { betId: bet._id?.toString(), roundId: round._id?.toString(), action: "calculateBetPayout" },
        });
        bulkBetOps.push({
          updateOne: {
            filter: { _id: bet._id },
            update: { $set: { isWin: false, payoutAmount: 0 } },
          },
        });
      }
    }

    if (bulkBetOps.length) {
      await WinGoBet.bulkWrite(bulkBetOps);
    }

    // 4. Credit winners
    if (userIncrementMap.size > 0) {
      const bulkUserOps = [];

      for (const [userId, amount] of userIncrementMap.entries()) {
        bulkUserOps.push({
          updateOne: {
            filter: { _id: userId },
            update: { $inc: { walletBalance: amount } },
          },
        });
      }

      await User.bulkWrite(bulkUserOps);
    }

    // 5. Finalise
    await WinGoRound.updateOne(
      { _id: round._id },
      { $set: { status: "settled", settledAt: new Date() } }
    );
  } catch (err) {
    console.error("WinGo settlement failed for round", roundId, err);
    logErrorToDbAsync(err, {
      source: "winGoScheduler",
      context: { roundId: roundId?.toString(), action: "settleRound" },
    });
  }
}

/* ============================================================
   LOCK & SETTLE EXPIRED "open" ROUNDS
   Atomically moves open → processing, then settles.
============================================================ */
async function lockAndSettleExpiredRounds(gameCode, nowMs) {
  while (true) {
    const round = await WinGoRound.findOneAndUpdate(
      {
        gameCode,
        status: "open",
        endsAt: { $lte: new Date(nowMs + DRAW_DURATION_MS) },
      },
      { $set: { status: "processing" } },
      { new: true }
    );

    if (!round) break;

    await settleRound(round._id);
  }
}

/* ============================================================
   RECOVER ROUNDS STUCK IN INTERMEDIATE / ABANDONED STATES
   Runs every tick but queries are cheap (indexed + rare hits).
============================================================ */
async function recoverStaleRounds(gameCode, nowMs) {
  const staleThreshold = new Date(nowMs - STALE_ROUND_MS);

  // 1. "processing" rounds stuck too long → retry settlement
  while (true) {
    const round = await WinGoRound.findOne({
      gameCode,
      status: "processing",
      updatedAt: { $lte: staleThreshold },
    });
    if (!round) break;
    await settleRound(round._id);
  }

  // 2. "closed" rounds stuck too long → retry credit + finalise
  while (true) {
    const round = await WinGoRound.findOne({
      gameCode,
      status: "closed",
      updatedAt: { $lte: staleThreshold },
    });
    if (!round) break;
    await settleRound(round._id);
  }

  // 3. Old "scheduled" or "open" rounds whose window ended long ago
  //    (e.g. server was offline during their window)
  while (true) {
    const round = await WinGoRound.findOneAndUpdate(
      {
        gameCode,
        status: { $in: ["scheduled", "open"] },
        endsAt: { $lte: staleThreshold },
      },
      { $set: { status: "processing" } },
      { new: true }
    );
    if (!round) break;
    await settleRound(round._id);
  }
}

/* ============================================================
   ENSURE CURRENT + NEXT ROUND EXIST
   • Current window round → "open"
   • Next window round    → "scheduled"
============================================================ */
async function ensureCurrentRound(game, nowMs) {
  const { startsAt, endsAt, period } = getRoundWindow(
    game.durationSeconds,
    game.gameCode,
    nowMs
  );

  let round = await WinGoRound.findOne({
    gameCode: game.gameCode,
    period,
  });

  let justActivated = false;

  if (!round) {
    try {
      const status = startsAt.getTime() <= nowMs ? "open" : "scheduled";
      round = await WinGoRound.create({
        gameCode: game.gameCode,
        period,
        startsAt,
        endsAt,
        status,
      });
      if (status === "open") justActivated = true;
    } catch (err) {
      if (err.code === 11000) {
        round = await WinGoRound.findOne({
          gameCode: game.gameCode,
          period,
        });
      } else {
        throw err;
      }
    }
  }

  // Scheduled round's start time has arrived — activate it (atomic)
  if (round && round.status === "scheduled" && startsAt.getTime() <= nowMs) {
    const activated = await WinGoRound.findOneAndUpdate(
      { _id: round._id, status: "scheduled" },
      { $set: { status: "open" } },
      { new: true }
    );
    if (activated) justActivated = true;
  }

  // When a round just became active, pre-create the next round as "scheduled"
  if (justActivated) {
    const next = getRoundWindow(
      game.durationSeconds,
      game.gameCode,
      endsAt.getTime()
    );

    try {
      await WinGoRound.create({
        gameCode: game.gameCode,
        period: next.period,
        startsAt: next.startsAt,
        endsAt: next.endsAt,
        status: "scheduled",
      });
    } catch (err) {
      if (err.code !== 11000) throw err;
    }
  }
}

/* ============================================================
   MAIN TICK
   - ensureCurrentRound FIRST so next round opens even if settlement fails
   - Per-game try-catch so one game's failure doesn't block others
   - Mutex prevents overlapping ticks (prod race conditions)
============================================================ */
async function tick() {
  if (tickInProgress) return;
  tickInProgress = true;
  const nowMs = Date.now();

  try {
    await Promise.all(
      WINGO_GAMES.map(async (game) => {
        try {
          await recoverStaleRounds(game.gameCode, nowMs);
          // Activate next round BEFORE settlement — time-based, not settlement-dependent
          await ensureCurrentRound(game, nowMs);
          await lockAndSettleExpiredRounds(game.gameCode, nowMs);
        } catch (err) {
          console.error(`WinGo scheduler error for game ${game.gameCode}:`, err);
          logErrorToDbAsync(err, {
            source: "winGoScheduler",
            context: { gameCode: game.gameCode, action: "tick" },
          });
        }
      })
    );
  } finally {
    tickInProgress = false;
  }
}

/* ============================================================
   START SCHEDULER
============================================================ */
export function startWinGoScheduler() {
  tick();
  setInterval(tick, TICK_INTERVAL_MS);

  console.log("🎰 WinGo scheduler started (production-safe mode)");
}
