import mongoose from "mongoose";

const bonusSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        phone: {
            type: String,
            required: true,
        },
        bonusType: {
            type: String,
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        remark: {
            type: String,
            default: "",
        },
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

const Bonus = mongoose.model("Bonus", bonusSchema);

export default Bonus;
