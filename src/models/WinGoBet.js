import mongoose from "mongoose";
import { BIG_SMALL_MAP, COLOR_MAP, VALID_BET_TYPES } from "../constants/winGoConstants.js";

const winGoBetSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        round: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "WinGoRound",
            required: true,
            index: true,
        },
        betType: {
            type: String,
            enum: VALID_BET_TYPES,
            required: true,
        },
        choiceBigSmall: {
            type: String,
            enum: [BIG_SMALL_MAP.BIG, BIG_SMALL_MAP.SMALL],
            default: null,
        },
        choiceNumber: {
            type: Number,
            default: null,
            min: 0,
            max: 9,
        },
        choiceColor: {
            type: String,
            enum: [COLOR_MAP.RED, COLOR_MAP.GREEN, COLOR_MAP.VIOLET],
            default: null,
        },
        amount: {
            type: Number,
            required: true,
            min: 1,
        },
        isWin: {
            type: Boolean,
            default: null,
        },
        payoutAmount: {
            type: Number,
            default: 0,
        }
    },
    {
        timestamps: true,
    }
);

winGoBetSchema.index({ user: 1, round: 1 });

const WinGoBet = mongoose.model("WinGoBet", winGoBetSchema);

export default WinGoBet;

