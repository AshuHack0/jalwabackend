import WinGoGame from "../models/WinGoGame.js";
import WinGoRound from "../models/WinGoRound.js";
import WinGoBet from "../models/WinGoBet.js";
import User from "../models/User.js";
import { getOutcomeFromDigit, calculateBetPayout } from "../utils/winGoRules.js";
import { BIG_SMALL_MAP } from "../constants/winGoConstants.js";

const TICK_INTERVAL_MS = 1000; // 1 second is enough in production

/* ============================================================
   ROUND WINDOW CALCULATION (UTC SAFE)
============================================================ */
function getRoundWindow(durationSeconds, gameCode, forTime = Date.now()) {
  const date = new Date(forTime);

  const dateStr =
    date.getUTCFullYear().toString() +
    String(date.getUTCMonth() + 1).padStart(2, "0") +
    String(date.getUTCDate()).padStart(2, "0");

  const midnightUTC = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );

  const secondsSinceMidnight = Math.floor((forTime - midnightUTC) / 1000);
  const slot = Math.floor(secondsSinceMidnight / durationSeconds);

  const startsAt = new Date(midnightUTC + slot * durationSeconds * 1000);
  const endsAt = new Date(startsAt.getTime() + durationSeconds * 1000);
  const sequence = slot + 1;

  const period = `${dateStr}${gameCode}${String(sequence).padStart(4, "0")}`;

  return { startsAt, endsAt, period };
}

/* ============================================================
   SAFE ROUND SETTLEMENT (ATOMIC LOCK, NO TRANSACTIONS)
============================================================ */
async function settleRoundLocked(roundId) {
  try {
    const round = await WinGoRound.findById(roundId);

    // Idempotency guard — only process rounds we locked
    if (!round || round.status !== "processing") {
      return;
    }

    // Determine winning digit
    const winningDigit =
      typeof round.outcomeNumber === "number" &&
      round.outcomeNumber >= 0 &&
      round.outcomeNumber <= 9
        ? round.outcomeNumber
        : Math.floor(Math.random() * 10);

    const { bigSmall, color } = getOutcomeFromDigit(winningDigit);

    round.outcomeNumber = winningDigit;
    round.outcomeBigSmall =
      bigSmall === "big" ? BIG_SMALL_MAP.BIG : BIG_SMALL_MAP.SMALL;
    round.outcomeColor = color;
    round.status = "closed";

    await round.save();

    // Evaluate bets
    const bets = await WinGoBet.find({ round: round._id });

    const bulkBetOps = [];
    const userIncrementMap = new Map();

    for (const bet of bets) {
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
    }

    if (bulkBetOps.length) {
      await WinGoBet.bulkWrite(bulkBetOps);
    }

    // Credit winners in bulk
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

    round.status = "settled";
    round.settledAt = new Date();

    await round.save();
  } catch (err) {
    console.error("WinGo settlement failed:", err);
  }
}

/* ============================================================
   ATOMIC ROUND LOCKING
============================================================ */
async function lockAndSettleExpiredRounds(gameId, now) {
  while (true) {
    const round = await WinGoRound.findOneAndUpdate(
      {
        game: gameId,
        status: { $in: ["open", "scheduled"] },
        endsAt: { $lte: new Date(now) },
      },
      { $set: { status: "processing" } },
      { new: true }
    );

    if (!round) break;

    await settleRoundLocked(round._id);
  }
}

/* ============================================================
   ENSURE CURRENT ROUND EXISTS
============================================================ */
async function ensureCurrentRound(game, now) {
  const { startsAt, endsAt, period } = getRoundWindow(
    game.durationSeconds,
    game.gameCode,
    now
  );

  let round = await WinGoRound.findOne({
    game: game._id,
    period,
  });

  if (!round) {
    try {
      round = await WinGoRound.create({
        game: game._id,
        period,
        startsAt,
        endsAt,
        status: "open",
      });
    } catch (err) {
      if (err.code === 11000) {
        round = await WinGoRound.findOne({
          game: game._id,
          period,
        });
      } else {
        throw err;
      }
    }
  }

  if (round.status === "scheduled" && startsAt <= new Date(now)) {
    await WinGoRound.updateOne(
      { _id: round._id },
      { $set: { status: "open" } }
    );
  }
}

/* ============================================================
   MAIN TICK
============================================================ */
async function tick() {
  const now = Date.now();

  try {
    const games = await WinGoGame.find({ isActive: { $ne: false } }).lean();
    if (!games.length) return;

    for (const game of games) {
      if (!game.gameCode || !game.durationSeconds) continue;

      await lockAndSettleExpiredRounds(game._id, now);
      await ensureCurrentRound(game, now);
    }
  } catch (err) {
    console.error("WinGo scheduler error:", err);
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
