import mongoose from "mongoose";

const withdrawalSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        phone: { type: String, required: true },
        amount: { type: Number, required: true, min: 0 },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        bankName: { type: String, default: "" },
        accountHolder: { type: String, default: "" },
        accountNumber: { type: String, default: "" },
        ifscCode: { type: String, default: "" },
        paymentRef: { type: String, default: null },
        orderId: { type: String, default: null },
        remark: { type: String, default: "" },
    },
    { timestamps: true }
);

withdrawalSchema.index({ user: 1, createdAt: -1 });

const Withdrawal = mongoose.model("Withdrawal", withdrawalSchema);

export default Withdrawal;
