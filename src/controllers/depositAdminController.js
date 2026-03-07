import Deposit from "../models/Deposit.js";
import User from "../models/User.js";

// GET /admin/deposits?status=pending&page=1 — list deposits with user info
export const listDeposits = async (req, res, next) => {
    try {
        const { status = "pending", page = 1, limit = 50, search = "" } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const filter = { status };

        const [deposits, total] = await Promise.all([
            Deposit.find(filter)
                .populate("user", "phone nickname uid")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Deposit.countDocuments(filter),
        ]);

        // Apply search filter on populated phone
        const results = search
            ? deposits.filter((d) => d.user?.phone?.includes(search) || d.orderId?.includes(search))
            : deposits;

        res.status(200).json({ success: true, data: { deposits: results, total } });
    } catch (error) {
        next(error);
    }
};

// PATCH /admin/deposits/:id/approve
export const approveDeposit = async (req, res, next) => {
    try {
        const deposit = await Deposit.findById(req.params.id);
        if (!deposit) return res.status(404).json({ success: false, message: "Deposit not found" });
        if (deposit.status !== "pending") return res.status(400).json({ success: false, message: "Deposit is not pending" });

        deposit.status = "completed";
        await deposit.save();

        await User.findByIdAndUpdate(deposit.user, {
            $inc: { walletBalance: deposit.amount, totalDeposited: deposit.amount },
        });

        res.status(200).json({ success: true, message: "Deposit approved and wallet credited" });
    } catch (error) {
        next(error);
    }
};

// PATCH /admin/deposits/:id/reject
export const rejectDeposit = async (req, res, next) => {
    try {
        const deposit = await Deposit.findById(req.params.id);
        if (!deposit) return res.status(404).json({ success: false, message: "Deposit not found" });
        if (deposit.status !== "pending") return res.status(400).json({ success: false, message: "Deposit is not pending" });

        deposit.status = "failed";
        await deposit.save();

        res.status(200).json({ success: true, message: "Deposit rejected" });
    } catch (error) {
        next(error);
    }
};
