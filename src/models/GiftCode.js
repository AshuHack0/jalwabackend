import mongoose from "mongoose";

const giftCodeSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        maxUses: {
            type: Number,
            required: true,
            min: 1,
        },
        usedCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        remark: {
            type: String,
            default: "",
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

const GiftCode = mongoose.model("GiftCode", giftCodeSchema);

export default GiftCode;
