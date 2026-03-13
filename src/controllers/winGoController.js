import WinGoRound from "../models/WinGoRound.js";
import WinGoBet from "../models/WinGoBet.js";
import {
    MIN_DEPOSIT_FOR_PREDICTION,
    DURATION_FROM_PATH,
    GAME_BY_DURATION,
    BET_TYPE_BIG_SMALL,
    BET_TYPE_NUMBER,
    BET_TYPE_COLOR,
    BIG_SMALL_MAP,
    COLOR_MAP,
    DRAW_DURATION_MS,
} from "../constants/winGoConstants.js";

// Internal: places a bet for a game identified.
const placeBet = async (req, res, next) => {
    try {
        const user = req.user;

        if ((user.walletBalance || 0) < MIN_DEPOSIT_FOR_PREDICTION) {
            return res.status(403).json({
                success: false,
                message: "You must at least 2000 to activate WinGo predictions.",
            });
        }

        const { betType: normalizedBetType, choice, amount, period } = req.validated;

        const round = period
            ? await WinGoRound.findOne({ period, status: "open" })
            : null;

        if (!round) {
            return res.status(400).json({
                success: false,
                message: "No active WinGo round available.",
            });
        }

        const now = new Date();
        const bettingDeadline = new Date(round.endsAt.getTime() - DRAW_DURATION_MS);
        if (now < round.startsAt || now > bettingDeadline || round.status !== "open") {
            return res.status(400).json({
                success: false,
                message: "Betting for this round is closed.",
            });
        }

        if ((user.walletBalance || 0) < amount) {
            return res.status(400).json({
                success: false,
                message: "Insufficient wallet balance.",
            });
        }

        user.walletBalance -= amount;
        await user.save();

        const betPayload = {
            user: user._id,
            round: round._id,
            amount,
            betType: normalizedBetType,
        };

        if (normalizedBetType === BET_TYPE_BIG_SMALL) {
            betPayload.choiceBigSmall = choice.toString().toUpperCase() === BIG_SMALL_MAP.BIG ? BIG_SMALL_MAP.BIG : BIG_SMALL_MAP.SMALL;
        } else if (normalizedBetType === BET_TYPE_NUMBER) {
            betPayload.choiceNumber = Number(choice);
        } else if (normalizedBetType === BET_TYPE_COLOR) {
            const normalized = choice.toString().toUpperCase();
            betPayload.choiceColor = Object.values(COLOR_MAP).find((c) => c === normalized) ?? normalized;
        }

        const bet = await WinGoBet.create(betPayload);

        res.status(201).json({
            success: true,
            data: bet,
        });
    } catch (error) {
        next(error);
    }
};

// Lightweight: only fetches the current active round for a game duration
const getCurrentRound = async (req, res, next) => {
    try {
        const durationSeconds = DURATION_FROM_PATH[req.path];
        if (!durationSeconds) {
            return res.status(400).json({
                success: false,
                message: "Invalid WinGo game route",
            });
        }

        const game = GAME_BY_DURATION[durationSeconds];
        if (!game) {
            return res.status(404).json({
                success: false,
                message: "WinGo game not found",
            });
        }

        const now = new Date();
        const nowMs = now.getTime();

        // Find the round whose time window includes "now" (any status)
        const currentRound = await WinGoRound.findOne({
            gameCode: game.gameCode,
            startsAt: { $lte: now },
            endsAt: { $gte: now },
        })
            .sort({ startsAt: 1 })
            .lean();

        if (!currentRound) {
            return res.status(404).json({
                success: false,
                message: "No active round available. Please wait.",
            });
        }

        const bettingEndsAt = new Date(currentRound.endsAt.getTime() - DRAW_DURATION_MS);
        const isBettingOpen = currentRound.status === "open" && nowMs < bettingEndsAt.getTime();
        const isDrawPhase = !isBettingOpen && nowMs < currentRound.endsAt.getTime();

        // During betting phase, hide outcome so clients can't cheat
        if (isBettingOpen) {
            delete currentRound.outcomeNumber;
            delete currentRound.outcomeBigSmall;
            delete currentRound.outcomeColor;
        }

        // Pre-fetch next scheduled round (no outcomes)
        const nextRound = await WinGoRound.findOne(
            {
                gameCode: game.gameCode,
                startsAt: { $gte: currentRound.endsAt },
                status: { $in: ["scheduled", "open"] },
            },
            {
                outcomeBigSmall: 0,
                outcomeColor: 0,
                outcomeNumber: 0,
            }
        )
            .sort({ startsAt: 1 })
            .lean();

        res.status(200).json({
            success: true,
            data: {
                game,
                currentRound,
                nextRound,
                isBettingOpen,
                isDrawPhase,
                bettingEndsAt,
                drawDurationMs: DRAW_DURATION_MS,
                serverTime: new Date().toISOString(),
            },
        });
    } catch (error) {
        next(error);
    }
};

// Paginated history of past rounds for a game duration
const getGameHistory = async (req, res, next) => {
    try {
        // Strip /history suffix to get the base game path
        const gamePath = req.path.replace("/history", "");
        const durationSeconds = DURATION_FROM_PATH[gamePath];
        if (!durationSeconds) {
            return res.status(400).json({
                success: false,
                message: "Invalid WinGo game route",
            });
        }

        const game = GAME_BY_DURATION[durationSeconds];
        if (!game) {
            return res.status(404).json({
                success: false,
                message: "WinGo game not found",
            });
        }

        const now = new Date();

        // Pagination params
        const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
        const pageSize = Number(req.query.pageSize) > 0 ? Number(req.query.pageSize) : 20;
        const skip = (page - 1) * pageSize;

        // History rounds query
        const historyFilter = {
            gameCode: game.gameCode,
            $or: [
                { endsAt: { $lt: now } },
                { status: { $in: ["closed", "settled"] } },
            ],
        };

        const totalHistoryCount = await WinGoRound.countDocuments(historyFilter);

        const historyRounds = await WinGoRound.find(historyFilter)
            .sort({ startsAt: -1 })
            .skip(skip)
            .limit(pageSize)
            .lean();

        res.status(200).json({
            success: true,
            data: {
                historyRounds,
                historyPagination: {
                    totalItems: totalHistoryCount,
                    totalPages: Math.ceil(totalHistoryCount / pageSize),
                    currentPage: page,
                    pageSize,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

// Get authenticated user's bet history for a specific game duration
const getMyHistory = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Derive duration from the base path (strip /myHistory suffix)
        const gamePath = req.path.replace("/myHistory", "");
        const durationSeconds = DURATION_FROM_PATH[gamePath];
        if (!durationSeconds) {
            return res.status(400).json({
                success: false,
                message: "Invalid WinGo game route",
            });
        }

        const game = GAME_BY_DURATION[durationSeconds];
        if (!game) {
            return res.status(404).json({
                success: false,
                message: "WinGo game not found",
            });
        }

        const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
        const pageSize = Number(req.query.pageSize) > 0 ? Number(req.query.pageSize) : 10;
        const skip = (page - 1) * pageSize;

        // Find all rounds for this game
        const roundIds = await WinGoRound.find({ gameCode: game.gameCode }).distinct("_id");

        const filter = { user: userId, round: { $in: roundIds } };
        const totalItems = await WinGoBet.countDocuments(filter);

        const bets = await WinGoBet.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageSize)
            .populate({
                path: "round",
                select: "period outcomeNumber outcomeBigSmall outcomeColor status startsAt endsAt",
            })
            .lean();

        res.status(200).json({
            success: true,
            data: {
                bets,
                pagination: {
                    totalItems,
                    totalPages: Math.ceil(totalItems / pageSize),
                    currentPage: page,
                    pageSize,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

// Admin: get the current prediction (outcomeNumber) set on the current open round
const getAdminPrediction = async (req, res, next) => {
    try {
        const gamePath = req.path.replace("/prediction", "");
        const durationSeconds = DURATION_FROM_PATH[gamePath];
        if (!durationSeconds) {
            return res.status(400).json({ success: false, message: "Invalid WinGo game route" });
        }
        const game = GAME_BY_DURATION[durationSeconds];
        if (!game) {
            return res.status(404).json({ success: false, message: "WinGo game not found" });
        }

        const now = new Date();
        const currentRound = await WinGoRound.findOne({
            gameCode: game.gameCode,
            status: "open",
            endsAt: { $gt: now },
        }).lean();

        if (!currentRound) {
            return res.status(404).json({ success: false, message: "No active round found" });
        }

        return res.json({
            success: true,
            data: { period: currentRound.period, outcomeNumber: currentRound.outcomeNumber, outcomeSetByAdmin: currentRound.outcomeSetByAdmin },
        });
    } catch (error) {
        next(error);
    }
};

// Admin: set the prediction (outcomeNumber) on the current open round (must be before last 5 seconds)
const setAdminPrediction = async (req, res, next) => {
    try {
        const gamePath = req.path.replace("/prediction", "");
        const durationSeconds = DURATION_FROM_PATH[gamePath];
        if (!durationSeconds) {
            return res.status(400).json({ success: false, message: "Invalid WinGo game route" });
        }
        const game = GAME_BY_DURATION[durationSeconds];
        if (!game) {
            return res.status(404).json({ success: false, message: "WinGo game not found" });
        }

        const { number } = req.body;
        if (!Number.isInteger(number) || number < 0 || number > 9) {
            return res.status(400).json({ success: false, message: "number must be an integer between 0 and 9" });
        }

        const now = new Date();
        const currentRound = await WinGoRound.findOne({
            gameCode: game.gameCode,
            status: "open",
            endsAt: { $gt: now },
        });

        if (!currentRound) {
            return res.status(404).json({ success: false, message: "No active round found to set prediction on" });
        }

        if (currentRound.outcomeNumber !== null && currentRound.outcomeNumber !== undefined) {
            return res.status(400).json({ success: false, message: "Prediction already set for this round. Unset it first before setting a new one." });
        }

        const bettingDeadline = new Date(currentRound.endsAt.getTime() - DRAW_DURATION_MS);
        if (now >= bettingDeadline) {
            return res.status(400).json({ success: false, message: "Cannot set prediction in the last 5 seconds of the round" });
        }

        // Check if the last 2 rounds already had consecutive wrong predictions
        // If so, the admin's number must NOT produce a 3rd wrong prediction
        if (currentRound.predictedBigSmall) {
            const recentRounds = await WinGoRound.find({
                gameCode: game.gameCode,
                status: "settled",
                predictedBigSmall: { $ne: null },
            })
                .sort({ endsAt: -1 })
                .limit(2)
                .lean();

            let consecutiveLosses = 0;
            for (const r of recentRounds) {
                if (r.predictedBigSmall && r.outcomeBigSmall && r.predictedBigSmall !== r.outcomeBigSmall) {
                    consecutiveLosses++;
                } else {
                    break;
                }
            }

            if (consecutiveLosses >= 2) {
                // Admin's number must match the current round's predictedBigSmall
                const adminBigSmall = number >= 5 ? "BIG" : "SMALL";
                if (adminBigSmall !== currentRound.predictedBigSmall) {
                    const validNumbers = currentRound.predictedBigSmall === "BIG" ? [5, 6, 7, 8, 9] : [0, 1, 2, 3, 4];
                    return res.status(400).json({
                        success: false,
                        message: `Cannot set this number. Last 2 rounds already had wrong predictions. This round's hint is ${currentRound.predictedBigSmall} — you must pick one of: ${validNumbers.join(", ")}.`,
                    });
                }
            }
        }

        currentRound.outcomeNumber = number;
        currentRound.outcomeSetByAdmin = true;
        await currentRound.save();

        return res.json({
            success: true,
            data: { period: currentRound.period, outcomeNumber: currentRound.outcomeNumber, outcomeSetByAdmin: true },
        });
    } catch (error) {
        next(error);
    }
};

// Admin: unset the prediction on the current open round (revert to random)
const unsetAdminPrediction = async (req, res, next) => {
    try {
        const gamePath = req.path.replace("/prediction", "");
        const durationSeconds = DURATION_FROM_PATH[gamePath];
        if (!durationSeconds) {
            return res.status(400).json({ success: false, message: "Invalid WinGo game route" });
        }
        const game = GAME_BY_DURATION[durationSeconds];
        if (!game) {
            return res.status(404).json({ success: false, message: "WinGo game not found" });
        }

        const now = new Date();
        const currentRound = await WinGoRound.findOne({
            gameCode: game.gameCode,
            status: "open",
            endsAt: { $gt: now },
        });

        if (!currentRound) {
            return res.status(404).json({ success: false, message: "No active round found" });
        }

        if (!currentRound.outcomeSetByAdmin) {
            return res.status(400).json({ success: false, message: "Cannot unset prediction that was not set by admin" });
        }

        currentRound.outcomeNumber = null;
        currentRound.outcomeSetByAdmin = false;
        await currentRound.save();

        return res.json({
            success: true,
            data: { period: currentRound.period, outcomeNumber: null, outcomeSetByAdmin: false },
        });
    } catch (error) {
        next(error);
    }
};

export { placeBet, getCurrentRound, getGameHistory, getMyHistory, getAdminPrediction, setAdminPrediction, unsetAdminPrediction };
