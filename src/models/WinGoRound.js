import mongoose from "mongoose";
import { COLOR_MAP, BIG_SMALL_MAP } from "../constants/winGoConstants.js";

const winGoRoundSchema = new mongoose.Schema(
    {
        gameCode: {
            type: String,
            required: true,
            index: true,
        },
        period: {           // e.g. "20260211100051211" = YYYYMMDD + gameCode + dailySequence
            type: String,
            required: true,
            unique: true,
        },
        outcomeBigSmall: {
            type: String,
            enum: [BIG_SMALL_MAP.BIG, BIG_SMALL_MAP.SMALL],
            default: null,
        },
        outcomeColor: {
            type: String,
            enum: [COLOR_MAP.RED, COLOR_MAP.GREEN, COLOR_MAP.VIOLET, COLOR_MAP.RED_VIOLET, COLOR_MAP.GREEN_VIOLET],
            default: null,
        },
        outcomeNumber: {
            type: Number,
            default: null,
            min: 0,
            max: 9,
        },
        startsAt: {
            type: Date,
            required: true,
        },
        endsAt: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: ["scheduled", "open", "processing", "closed", "settled"],
            default: "scheduled",
            index: true,
        },
        settledAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes for scheduler queries
winGoRoundSchema.index({ gameCode: 1, status: 1, endsAt: 1 });
winGoRoundSchema.index({ gameCode: 1, status: 1, updatedAt: 1 });

const WinGoRound = mongoose.model("WinGoRound", winGoRoundSchema);

export default WinGoRound;

