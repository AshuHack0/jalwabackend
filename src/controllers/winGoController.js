import User from "../models/User.js";
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

export { placeBet, getCurrentRound, getGameHistory, getMyHistory };
