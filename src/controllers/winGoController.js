import User from "../models/User.js";
import WinGoGame from "../models/WinGoGame.js";
import WinGoRound from "../models/WinGoRound.js";
import WinGoBet from "../models/WinGoBet.js";
import {
    MIN_DEPOSIT_FOR_PREDICTION,
    DURATION_FROM_PATH,
    BET_TYPE_BIG_SMALL,
    BET_TYPE_NUMBER,
    BET_TYPE_COLOR,
    BIG_SMALL_MAP,
    COLOR_MAP,
} from "../constants/winGoConstants.js";

// Internal: places a bet for a game identified.
const placeBet = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        if ((user.totalDeposited || 0) < MIN_DEPOSIT_FOR_PREDICTION) {
            return res.status(403).json({
                success: false,
                message: "You must deposit at least 2000 to activate WinGo predictions.",
            });
        }

        const { betType: normalizedBetType, choice, amount, roundId } = req.validated;

        const round = roundId ? await WinGoRound.findById(roundId) : null;

        if (!round) {
            return res.status(400).json({
                success: false,
                message: "No active WinGo round available.",
            });
        }

        const now = new Date();
        if (now < round.startsAt || now > round.endsAt || round.status === "closed") {
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

        const existingBet = await WinGoBet.findOne({ user: user._id, round: round._id });

        if (existingBet) {
            return res.status(400).json({
                success: false,
                message: "You have already placed a bet for this round.",
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

const getGameByDuration = async (req, res, next) => {
    try {
        const durationSeconds = DURATION_FROM_PATH[req.path];
        if (!durationSeconds) {
            return res.status(400).json({
                success: false,
                message: "Invalid WinGo game route",
            });
        }

        const game = await WinGoGame.findOne({ durationSeconds });
        if (!game) {
            return res.status(404).json({
                success: false,
                message: "WinGo game not found",
            });
        }

        const now = new Date();

        // Pagination params for history
        const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
        const pageSize = Number(req.query.pageSize) > 0 ? Number(req.query.pageSize) : 20;
        const skip = (page - 1) * pageSize;

        // Current active round (if any) - exclude outcome fields directly in query
        const currentRound = await WinGoRound.findOne(
            {
                game: game._id,
                startsAt: { $lte: now },
                endsAt: { $gte: now },
                status: "open",
            },
            {
                outcomeBigSmall: 0,
                outcomeColor: 0,
                outcomeNumber: 0,
            }
        )
            .sort({ startsAt: -1 })
            .lean();

        // History rounds query
        const historyFilter = {
            game: game._id,
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
                game,
                currentRound,
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

export { placeBet, getGameByDuration };
