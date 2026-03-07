import Withdrawal from "../models/Withdrawal.js";
import User from "../models/User.js";

// GET /withdrawals?status=pending — list withdrawals
export const listWithdrawals = async (req, res, next) => {
    try {
        const { status = "pending", page = 1, limit = 50, search = "" } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const filter = { status };

        const [withdrawals, total] = await Promise.all([
            Withdrawal.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
            Withdrawal.countDocuments(filter),
        ]);

        const results = search
            ? withdrawals.filter((w) => w.phone?.includes(search) || w.orderId?.includes(search))
            : withdrawals;

        res.status(200).json({ success: true, data: { withdrawals: results, total } });
    } catch (error) {
        next(error);
    }
};

// PATCH /withdrawals/:id/approve — approve, mark sent
export const approveWithdrawal = async (req, res, next) => {
    try {
        const withdrawal = await Withdrawal.findById(req.params.id);
        if (!withdrawal) return res.status(404).json({ success: false, message: "Withdrawal not found" });
        if (withdrawal.status !== "pending") return res.status(400).json({ success: false, message: "Withdrawal is not pending" });

        withdrawal.status = "approved";
        if (req.body.paymentRef) withdrawal.paymentRef = req.body.paymentRef;
        await withdrawal.save();

        res.status(200).json({ success: true, message: "Withdrawal approved" });
    } catch (error) {
        next(error);
    }
};

// PATCH /withdrawals/:id/reject — reject and refund wallet
export const rejectWithdrawal = async (req, res, next) => {
    try {
        const withdrawal = await Withdrawal.findById(req.params.id);
        if (!withdrawal) return res.status(404).json({ success: false, message: "Withdrawal not found" });
        if (withdrawal.status !== "pending") return res.status(400).json({ success: false, message: "Withdrawal is not pending" });

        withdrawal.status = "rejected";
        if (req.body.remark) withdrawal.remark = req.body.remark;
        await withdrawal.save();

        // Refund wallet
        await User.findByIdAndUpdate(withdrawal.user, {
            $inc: { walletBalance: withdrawal.amount },
        });

        res.status(200).json({ success: true, message: "Withdrawal rejected and wallet refunded" });
    } catch (error) {
        next(error);
    }
};
