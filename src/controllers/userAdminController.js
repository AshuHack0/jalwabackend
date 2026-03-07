import User from "../models/User.js";

// GET /users — list all users (admin only), supports search by phone/uid
export const listUsers = async (req, res, next) => {
    try {
        const { phone, uid, page = 1, limit = 50 } = req.query;

        const filter = { role: "user" };
        if (phone) filter.phone = { $regex: phone, $options: "i" };
        if (uid) filter.uid = { $regex: uid, $options: "i" };
        if (req.query.isBanned !== undefined) filter.isBanned = req.query.isBanned === "true";

        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const [users, total] = await Promise.all([
            User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)),
            User.countDocuments(filter),
        ]);

        res.status(200).json({ success: true, data: { users, total, page: parseInt(page, 10), limit: parseInt(limit, 10) } });
    } catch (error) {
        next(error);
    }
};

// PATCH /users/:id/ban — toggle ban status (admin only)
export const toggleBan = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        if (user.role === "admin") {
            return res.status(400).json({ success: false, message: "Cannot ban an admin" });
        }

        user.isBanned = !user.isBanned;
        await user.save();

        res.status(200).json({
            success: true,
            message: user.isBanned ? "User banned" : "User unbanned",
            data: { isBanned: user.isBanned },
        });
    } catch (error) {
        next(error);
    }
};

// GET /users/bank-details — list users who have bank details (admin only)
export const listUsersWithBankDetails = async (req, res, next) => {
    try {
        const { phone } = req.query;
        const filter = {
            role: "user",
            $or: [
                { accountNumber: { $ne: "" } },
                { ifscCode: { $ne: "" } },
                { bankName: { $ne: "" } },
            ],
        };
        if (phone) filter.phone = { $regex: phone, $options: "i" };

        const users = await User.find(filter).sort({ updatedAt: -1 });
        res.status(200).json({ success: true, data: users });
    } catch (error) {
        next(error);
    }
};

// GET /users/by-phone?phone=xxx — fetch a single user by phone (admin only)
export const getUserByPhone = async (req, res, next) => {
    try {
        const { phone } = req.query;
        if (!phone) return res.status(400).json({ success: false, message: "phone is required" });

        const user = await User.findOne({ phone });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};

// PATCH /users/:id/bank — update bank details for a user (admin only)
export const updateBankDetails = async (req, res, next) => {
    try {
        const { bankName, accountHolder, accountNumber, ifscCode } = req.body;

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { bankName, accountHolder, accountNumber, ifscCode },
            { new: true }
        );
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        res.status(200).json({ success: true, message: "Bank details updated", data: user });
    } catch (error) {
        next(error);
    }
};

// DELETE /users/:id — delete a user (admin only)
export const deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        if (user.role === "admin") {
            return res.status(400).json({ success: false, message: "Cannot delete an admin" });
        }
        await user.deleteOne();
        res.status(200).json({ success: true, message: "User deleted" });
    } catch (error) {
        next(error);
    }
};
