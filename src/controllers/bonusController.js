import User from "../models/User.js";
import Bonus from "../models/Bonus.js";

// POST /bonus/assign — assign bonus to a user by phone (admin only)
export const assignBonus = async (req, res, next) => {
    try {
        const { phone, bonusType, amount, remark = "" } = req.body;

        if (!phone || !bonusType || amount === undefined || amount === null) {
            return res.status(400).json({ success: false, message: "phone, bonusType and amount are required" });
        }
        if (amount <= 0) {
            return res.status(400).json({ success: false, message: "Amount must be greater than 0" });
        }

        const user = await User.findOne({ phone });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found with this phone number" });
        }

        user.walletBalance = (user.walletBalance || 0) + parseFloat(amount);
        await user.save();

        const bonus = await Bonus.create({
            user: user._id,
            phone: user.phone,
            bonusType,
            amount: parseFloat(amount),
            remark,
            assignedBy: req.user._id,
        });

        res.status(201).json({
            success: true,
            message: `₹${amount} ${bonusType} bonus assigned to ${user.phone}`,
            data: bonus,
        });
    } catch (error) {
        next(error);
    }
};

// GET /bonus — list all assigned bonuses (admin only)
export const listBonuses = async (req, res, next) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

        const [bonuses, total] = await Promise.all([
            Bonus.find().sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)),
            Bonus.countDocuments(),
        ]);

        res.status(200).json({ success: true, data: { bonuses, total } });
    } catch (error) {
        next(error);
    }
};

