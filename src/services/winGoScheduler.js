/**
 * WinGo Round Scheduler (production-safe)
 * =====================================
 *
 * This service is responsible for creating WinGo rounds on time, closing/settling
 * rounds after their end time, evaluating all bets, crediting winners, and
 * recovering from crashes or partial progress.
 *
 * -------------------------
 * Core data model concepts
 * -------------------------
 * A "round" (`WinGoRound`) belongs to a game (`gameCode`) and is uniquely identified
 * by a deterministic `period` string derived from:
 * - UTC date (YYYYMMDD)
 * - `gameCode`
 * - daily sequence number for that duration window
 *
 * Round time windows are computed by `getRoundWindow(durationSeconds, gameCode, now)`
 * and are aligned to UTC midnight boundaries (same schedule for all servers).
 *
 * -------------------------
 * Round lifecycle / states
 * -------------------------
 * This scheduler uses the following round `status` values:
 *
 * - "scheduled"
 *   - Round exists for the next window but has not started yet.
 *   - Created ahead of time so clients can show next period.
 *
 * - "open"
 *   - Current active round where bets are accepted.
 *
 * - "processing"
 *   - Round has reached (or is about to reach) its end time and is being locked
 *     for settlement. This prevents multiple workers from settling the same "open"
 *     round concurrently.
 *
 * - "closed"
 *   - Outcome has been persisted to the round (outcomeNumber / outcomeBigSmall /
 *     outcomeColor). Bets can be evaluated deterministically from this point.
 *
 * - "settled"
 *   - Bets have been evaluated, winners credited, and the round is finalized.
 *
 * -------------------------
 * Outcome (BIG/SMALL, color)
 * -------------------------
 * The *only* source of BIG/SMALL is the winning digit (0-9):
 * - If `outcomeNumber` already exists on the round (0-9), we reuse it (idempotent).
 * - Otherwise we generate a digit using `Math.floor(Math.random() * 10)`.
 *
 * Then we derive:
 * - BIG/SMALL: digit >= 5 => "big", else "small" (see `getOutcomeFromDigit`)
 * - Stored as: "BIG" / "SMALL" via `BIG_SMALL_MAP`
 * - Color is also derived from the digit (see `getOutcomeFromDigit`)
 *
 * -------------------------
 * Draw window (anti-race)
 * -------------------------
 * `DRAW_DURATION_MS` defines a short window around the round end where we treat
 * an "open" round as eligible to be locked. In practice, this allows the backend
 * to lock the round slightly before/around its exact end, so settlement is smooth
 * and does not depend on perfect timer precision.
 *
 * ------------------------------------------
 * Settlement pipeline (idempotent by design)
 * ------------------------------------------
 * `settleRound(roundId)` handles both "processing" and "closed" rounds so it can
 * resume after a crash at any point:
 *
 * 1) Fetch round and ensure it is in a settle-able state.
 * 2) Determine winning digit:
 *    - reuse `round.outcomeNumber` if already set
 *    - otherwise generate and persist it
 * 3) Persist outcome and move status "processing" -> "closed"
 * 4) Fetch all bets for the round and compute each bet result using
 *    `calculateBetPayout(bet, winningDigit)`:
 *    - writes bet fields via `$set` (safe to run repeatedly)
 *    - aggregates winner credits per user in-memory
 * 5) Credit winners using bulk `$inc` on `User.walletBalance`
 * 6) Finalize by setting status -> "settled" and `settledAt`
 *
 * Notes:
 * - Bet evaluation writes are idempotent because they overwrite (`$set`) the same fields.
 * - If a bet payload is invalid, it is marked as losing with payout 0 and logged.
 *
 * -------------------------
 * Stale recovery (crash safe)
 * -------------------------
 * If the server crashes mid-round, rounds can be left in intermediate states.
 * `recoverStaleRounds()` re-drives settlement for rounds that have been stuck
 * longer than `STALE_ROUND_MS`:
 * - stuck "processing" -> retry settlement
 * - stuck "closed"     -> retry settlement (credits + finalize)
 * - very old "scheduled"/"open" whose window ended -> force to "processing" then settle
 *
 * -------------------------
 * Scheduler tick loop
 * -------------------------
 * The scheduler runs every `TICK_INTERVAL_MS` with a simple in-process mutex
 * (`tickInProgress`) to prevent overlapping ticks.
 *
 * For each configured game in `WINGO_GAMES`, per tick:
 * 1) Recover stale rounds (cheap, indexed queries; rare hits)
 * 2) Ensure current round exists and becomes "open" when its start time arrives
 *    - if a round just became active, pre-create the next one as "scheduled"
 * 3) Lock & settle expired "open" rounds:
 *    - atomically move "open" -> "processing"
 *    - run `settleRound()` to close + credit + finalize
 *
 * Each game is isolated with its own try/catch, so failure in one game does not
 * block the others. Errors are logged and also persisted via `logErrorToDbAsync()`.
 */

import WinGoRound from "../models/WinGoRound.js";
import WinGoBet from "../models/WinGoBet.js";
import User from "../models/User.js";
import { logErrorToDbAsync } from "../utils/logErrorToDb.js";
import { getOutcomeFromDigit, calculateBetPayout } from "../utils/winGoRules.js";
import { BIG_SMALL_MAP, WINGO_GAMES, DRAW_DURATION_MS } from "../constants/winGoConstants.js";
import { getRoundWindow } from "../utils/winGoRoundWindow.js";

const TICK_INTERVAL_MS = 500;
const STALE_ROUND_MS = 30_000; // recover rounds stuck longer than 30 s
let tickInProgress = false;

/* ============================================================
   SMART OUTCOME: max-2-consecutive-loss rule
   Checks last 2 settled rounds; if prediction was wrong both
   times, force the next outcome to match the prediction (win).
============================================================ */
async function smartOutcomeDigit(round) {
  // Admin override always wins
  if (round.outcomeSetByAdmin &&
      typeof round.outcomeNumber === "number" &&
      round.outcomeNumber >= 0 &&
      round.outcomeNumber <= 9) {
    return round.outcomeNumber;
  }

  const prediction = round.predictedBigSmall; // "BIG" | "SMALL" | null

  // Check last 2 settled rounds for consecutive wrong predictions
  const recent = await WinGoRound.find({
    gameCode: round.gameCode,
    status: "settled",
    predictedBigSmall: { $ne: null },
    _id: { $ne: round._id },
  })
    .sort({ endsAt: -1 })
    .limit(2)
    .lean();

  let consecutiveLosses = 0;
  for (const r of recent) {
    if (r.predictedBigSmall && r.outcomeBigSmall &&
        r.predictedBigSmall !== r.outcomeBigSmall) {
      consecutiveLosses++;
    } else {
      break;
    }
  }

  let targetBigSmall;
  if (prediction) {
    const forceWin = consecutiveLosses >= 2;
    const shouldWin = forceWin || Math.random() < 0.5;
    targetBigSmall = shouldWin ? prediction : (prediction === BIG_SMALL_MAP.BIG ? BIG_SMALL_MAP.SMALL : BIG_SMALL_MAP.BIG);
  } else {
    targetBigSmall = Math.random() < 0.5 ? BIG_SMALL_MAP.BIG : BIG_SMALL_MAP.SMALL;
  }

  const bigNumbers  = [5, 6, 7, 8, 9];
  const smallNumbers = [0, 1, 2, 3, 4];
  const pool = targetBigSmall === BIG_SMALL_MAP.BIG ? bigNumbers : smallNumbers;
  return pool[Math.floor(Math.random() * pool.length)];
}

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

    // 1. Determine winning digit using smart logic (idempotent — reuses existing closed outcome)
    const winningDigit = round.status === "closed" &&
      typeof round.outcomeNumber === "number" &&
      round.outcomeNumber >= 0 &&
      round.outcomeNumber <= 9
        ? round.outcomeNumber
        : await smartOutcomeDigit(round);

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
   SET NEXT ROUND PREDICTION
   Called immediately after a round settles. Tallies BIG vs SMALL
   bet amounts from the just-settled round and sets predictedBigSmall
   on the next "scheduled" round (only if not already set).
   Predicts the side with MORE total bet amount — users tend to
   repeat the majority side, so this keeps the house edge aligned.
============================================================ */
async function setNextRoundPrediction(gameCode, settledRoundId) {
  try {
    const bets = await WinGoBet.find(
      { round: settledRoundId },
      { choiceBigSmall: 1, amount: 1 }
    ).lean();

    let bigTotal = 0;
    let smallTotal = 0;

    for (const bet of bets) {
      if (bet.choiceBigSmall === BIG_SMALL_MAP.BIG) bigTotal += bet.amount;
      else if (bet.choiceBigSmall === BIG_SMALL_MAP.SMALL) smallTotal += bet.amount;
    }

    // Default to random if no big/small bets were placed
    const prediction =
      bigTotal === 0 && smallTotal === 0
        ? Math.random() < 0.5 ? BIG_SMALL_MAP.BIG : BIG_SMALL_MAP.SMALL
        : bigTotal >= smallTotal ? BIG_SMALL_MAP.BIG : BIG_SMALL_MAP.SMALL;

    // Find the next scheduled round and stamp the prediction (atomic — only if still null)
    await WinGoRound.findOneAndUpdate(
      { gameCode, status: "scheduled", predictedBigSmall: null },
      { $set: { predictedBigSmall: prediction } },
      { sort: { startsAt: 1 } }
    );
  } catch (err) {
    console.error("WinGo setNextRoundPrediction failed", gameCode, err);
    logErrorToDbAsync(err, {
      source: "winGoScheduler",
      context: { gameCode, settledRoundId: settledRoundId?.toString(), action: "setNextRoundPrediction" },
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
      { returnDocument: "after" }
    );

    if (!round) break;

    await settleRound(round._id);
    await setNextRoundPrediction(gameCode, round._id);
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
      { returnDocument: "after" }
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
      const autoPrediction = status === "open"
        ? (Math.random() < 0.5 ? BIG_SMALL_MAP.BIG : BIG_SMALL_MAP.SMALL)
        : null;
      round = await WinGoRound.create({
        gameCode: game.gameCode,
        period,
        startsAt,
        endsAt,
        status,
        predictedBigSmall: autoPrediction,
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
    const autoPrediction = Math.random() < 0.5 ? BIG_SMALL_MAP.BIG : BIG_SMALL_MAP.SMALL;
    const activated = await WinGoRound.findOneAndUpdate(
      { _id: round._id, status: "scheduled", predictedBigSmall: null },
      { $set: { status: "open", predictedBigSmall: autoPrediction } },
      { returnDocument: "after" }
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
