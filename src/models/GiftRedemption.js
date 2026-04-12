import mongoose from "mongoose";

const giftRedemptionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        code: {
            type: String,
            required: true,
            trim: true,
        },
        amount: {
            type: Number,
            required: true,
        },
    },
    { timestamps: true }
);

const GiftRedemption = mongoose.model("GiftRedemption", giftRedemptionSchema);

export default GiftRedemption;
