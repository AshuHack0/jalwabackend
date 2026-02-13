import WinGoGame from "../models/WinGoGame.js";
import WinGoRound from "../models/WinGoRound.js";
import WinGoBet from "../models/WinGoBet.js";
import User from "../models/User.js";
import { getOutcomeFromDigit, calculateBetPayout } from "../utils/winGoRules.js";
import { BIG_SMALL_MAP } from "../constants/winGoConstants.js";

const TICK_INTERVAL_MS = 500;

// Returns aligned start/end times and period string (YYYYMMDD + gameCode + daily sequence, UTC boundaries).
function getRoundWindow(durationSeconds, gameCode, forTime = Date.now()) {
    const date = new Date(forTime);

    const dateStr =
        date.getUTCFullYear().toString() +
        String(date.getUTCMonth() + 1).padStart(2, "0") +
        String(date.getUTCDate()).padStart(2, "0");

    const midnightUTC = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

    const secondsSinceMidnight = Math.floor((forTime - midnightUTC) / 1000);
    const slot = Math.floor(secondsSinceMidnight / durationSeconds);

    const startsAt = new Date(midnightUTC + slot * durationSeconds * 1000);
    const endsAt = new Date(startsAt.getTime() + durationSeconds * 1000);
    const sequence = slot + 1;
    const period = `${dateStr}${gameCode}${String(sequence).padStart(4, "0")}`;

    return { startsAt, endsAt, period };
}

// Settle round: use admin outcomeNumber if set, else random 0-9; derive bigSmall/color; evaluate bets and credit payouts.
async function settleRound(round) {
    const winningDigit =
        typeof round.outcomeNumber === "number" && round.outcomeNumber >= 0 && round.outcomeNumber <= 9
            ? round.outcomeNumber
            : Math.floor(Math.random() * 10);

    const { bigSmall, color } = getOutcomeFromDigit(winningDigit);

    round.outcomeNumber = winningDigit;
    round.outcomeBigSmall = bigSmall === "big" ? BIG_SMALL_MAP.BIG : BIG_SMALL_MAP.SMALL;
    round.outcomeColor = color;
    round.status = "closed";
    await round.save();

    const bets = await WinGoBet.find({ round: round._id }).lean();
    for (const bet of bets) {
        const { isWin, payoutAmount } = calculateBetPayout(bet, winningDigit);
        await WinGoBet.updateOne({ _id: bet._id }, { $set: { isWin, payoutAmount } });
        if (isWin && payoutAmount > 0) {
            await User.findByIdAndUpdate(bet.user, { $inc: { walletBalance: payoutAmount } });
        }
    }

    round.status = "settled";
    await round.save();
}

// Main tick: settle all ended rounds; ensure current round exists as "open" (promote admin-created "scheduled" if present).
async function tick() {
    const now = Date.now();
    const games = await WinGoGame.find({}).lean();
    if (games.length === 0) return;

    for (const game of games) {
        const duration = game.durationSeconds;
        const gameCode = game.gameCode;
        if (!gameCode) continue;

        try {
            // Settle ALL rounds whose time has ended but aren't settled yet
            const unsettledRounds = await WinGoRound.find({
                game: game._id,
                status: { $in: ["open", "scheduled", "closed"] },
                endsAt: { $lte: new Date(now) },
            });
            for (const round of unsettledRounds) {
                await settleRound(round);
            }

            // Current round — create as "open" or promote "scheduled" → "open"
            const current = getRoundWindow(duration, gameCode, now);
            let currentRound = await WinGoRound.findOne({ game: game._id, period: current.period });
            if (!currentRound) {
                try {
                    currentRound = await WinGoRound.create({
                        game: game._id,
                        period: current.period,
                        startsAt: current.startsAt,
                        endsAt: current.endsAt,
                        status: "open",
                    });
                } catch (createErr) {
                    // Race: another tick/process created this round; fetch and use it
                    if (createErr.code === 11000) {
                        currentRound = await WinGoRound.findOne({ game: game._id, period: current.period });
                    } else {
                        throw createErr;
                    }
                }
            }
            if (currentRound && currentRound.status === "scheduled") {
                // Admin pre-created this round (maybe with a preset outcome) — now open it for betting
                currentRound.status = "open";
                await currentRound.save();
            }
        } catch (err) {
            console.error(`WinGo scheduler error for game ${game.name}:`, err);
        }
    }
}

// Start the WinGo scheduler. All games run continuously.
export function startWinGoScheduler() {
    tick();
    setInterval(tick, TICK_INTERVAL_MS);
    console.log("🎰 WinGo scheduler started (all games running continuously)");
}
