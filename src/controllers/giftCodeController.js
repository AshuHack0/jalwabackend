import GiftCode from "../models/GiftCode.js";
import GiftRedemption from "../models/GiftRedemption.js";
import User from "../models/User.js";

// Generates a random alphanumeric gift code string.
function generateCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "GC-";
    for (let i = 0; i < 10; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// GET /gift-codes/claim — user claims a gift code if totalDeposited >= 5000
// If user already has an assigned code, returns the same one every time.
export const claimGiftCode = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).select("totalDeposited assignedGiftCode");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const totalDeposited = user.totalDeposited ?? 0;
        if (totalDeposited < 5000) {
            return res.status(403).json({
                success: false,
                message: `Your total deposit must be at least ₹5000 to generate a gift code. Current: ₹${totalDeposited}`,
            });
        }

        // If user already has an assigned code, return it
        if (user.assignedGiftCode) {
            const existingCode = await GiftCode.findOne({ code: user.assignedGiftCode });
            if (existingCode) {
                return res.status(200).json({
                    success: true,
                    data: { code: existingCode.code, amount: existingCode.amount },
                });
            }
        }

        // Find an available code not yet at max uses
        const giftCode = await GiftCode.findOne({
            isActive: true,
            $expr: { $lt: ["$usedCount", "$maxUses"] },
        });

        if (!giftCode) {
            return res.status(404).json({ success: false, message: "No gift codes available at the moment" });
        }

        // Save this code to the user so they always see the same one
        await User.findByIdAndUpdate(req.user._id, { assignedGiftCode: giftCode.code });

        res.status(200).json({ success: true, data: { code: giftCode.code, amount: giftCode.amount } });
    } catch (error) {
        next(error);
    }
};

// GET /gift-codes/my-code — returns the user's already-assigned gift code (if any)
export const getMyCode = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).select("totalDeposited assignedGiftCode");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (!user.assignedGiftCode) {
            return res.status(200).json({ success: true, data: null });
        }

        const giftCode = await GiftCode.findOne({ code: user.assignedGiftCode });
        if (!giftCode) {
            return res.status(200).json({ success: true, data: null });
        }

        return res.status(200).json({
            success: true,
            data: { code: giftCode.code, amount: giftCode.amount },
        });
    } catch (error) {
        next(error);
    }
};

// POST /gift-codes/redeem — user redeems a gift code, amount added to wallet
export const redeemGiftCode = async (req, res, next) => {
    try {
        const { code } = req.body;
        if (!code || !code.trim()) {
            return res.status(400).json({ success: false, message: "Gift code is required" });
        }

        const giftCode = await GiftCode.findOne({ code: code.trim().toUpperCase() });
        if (!giftCode) {
            return res.status(404).json({ success: false, message: "Invalid gift code" });
        }

        if (!giftCode.isActive) {
            return res.status(400).json({ success: false, message: "This gift code is no longer active" });
        }

        if (giftCode.usedCount >= giftCode.maxUses) {
            return res.status(400).json({ success: false, message: "This gift code has already been fully redeemed" });
        }

        const userId = req.user._id;

        // Prevent the same user from redeeming twice
        const alreadyRedeemed = giftCode.redeemedBy.some(
            (id) => id.toString() === userId.toString()
        );
        if (alreadyRedeemed) {
            return res.status(400).json({ success: false, message: "You have already redeemed this gift code" });
        }

        // Update gift code: increment usedCount and record this user
        giftCode.usedCount += 1;
        giftCode.redeemedBy.push(userId);
        if (giftCode.usedCount >= giftCode.maxUses) {
            giftCode.isActive = false;
        }
        await giftCode.save();

        // Add amount to user's wallet
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $inc: { walletBalance: giftCode.amount } },
            { new: true }
        ).select("walletBalance");

        // Persist redemption record for history
        await GiftRedemption.create({ user: userId, code: giftCode.code, amount: giftCode.amount });

        res.status(200).json({
            success: true,
            message: `Gift code redeemed! ₹${giftCode.amount} has been added to your wallet.`,
            data: {
                amount: giftCode.amount,
                walletBalance: updatedUser.walletBalance,
            },
        });
    } catch (error) {
        next(error);
    }
};

// GET /gift-codes/history — returns the current user's redemption history
export const getRedemptionHistory = async (req, res, next) => {
    try {
        const records = await GiftRedemption.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .select("code amount createdAt");

        res.status(200).json({ success: true, data: records });
    } catch (error) {
        next(error);
    }
};

// POST /gift-codes/generate — bulk generate gift codes (admin only)
export const generateGiftCodes = async (req, res, next) => {
    try {
        const { count = 1, maxUses, amount, remark = "" } = req.body;

        if (!maxUses || maxUses < 1) {
            return res.status(400).json({ success: false, message: "maxUses must be at least 1" });
        }
        if (amount === undefined || amount === null || amount < 0) {
            return res.status(400).json({ success: false, message: "amount is required and must be >= 0" });
        }

        const limit = Math.min(parseInt(count, 10) || 1, 100);
        const created = [];

        for (let i = 0; i < limit; i++) {
            let code;
            let attempts = 0;
            // Ensure uniqueness
            do {
                code = generateCode();
                attempts++;
            } while (attempts < 10 && (await GiftCode.exists({ code })));

            created.push(
                await GiftCode.create({
                    code,
                    amount: parseFloat(amount),
                    maxUses: parseInt(maxUses, 10),
                    remark,
                })
            );
        }

        res.status(201).json({
            success: true,
            message: `${created.length} gift code(s) generated`,
            data: created,
        });
    } catch (error) {
        next(error);
    }
};

// GET /gift-codes — list all gift codes (admin only)
export const listGiftCodes = async (_req, res, next) => {
    try {
        const codes = await GiftCode.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: codes });
    } catch (error) {
        next(error);
    }
};

// DELETE /gift-codes/:id — delete a gift code (admin only)
export const deleteGiftCode = async (req, res, next) => {
    try {
        const code = await GiftCode.findByIdAndDelete(req.params.id);
        if (!code) {
            return res.status(404).json({ success: false, message: "Gift code not found" });
        }
        res.status(200).json({ success: true, message: "Gift code deleted" });
    } catch (error) {
        next(error);
    }
};
