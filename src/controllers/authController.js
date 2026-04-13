import { v4 as uuidv4 } from "uuid";
import { env } from "../config/env.js";
import { generateToken } from "../utils/jwt.js";
import User from "../models/User.js";

// Registers a new user using phone, password and invite code.
// Requires validate(registerSchema) middleware - uses req.validated.
export const register = async (req, res, next) => {
    try {
        const { phone, password, inviteCode } = req.validated;

        if (inviteCode !== env.INVITE_CODE) {
            return res.status(400).json({
                success: false,
                message: "Invalid invite code",
            });
        }

        const existingUser = await User.findOne({ phone });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User already exists with this phone number",
            });
        }

        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        const generateNickname = () => {
            let suffix = "";
            for (let i = 0; i < 8; i++) {
                suffix += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return `MEMBER${suffix}`;
        };

        let nickname;
        let uid;
        const maxAttempts = 20;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            nickname = generateNickname();
            if (!(await User.exists({ nickname }))) break;
            if (attempt === maxAttempts - 1) {
                return res.status(500).json({
                    success: false,
                    message: "Could not generate unique nickname. Please try again.",
                });
            }
        }
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            uid = uuidv4();
            if (!(await User.exists({ uid }))) break;
            if (attempt === maxAttempts - 1) {
                return res.status(500).json({
                    success: false,
                    message: "Could not generate unique UID. Please try again.",
                });
            }
        }

        const user = await User.create({
            uid,
            phone,
            password,
            nickname,
            lastLogin: Date.now(),
        });

        res.status(201).json({
            success: true,
            token: generateToken(user._id),
            data: {
                id: user._id,
                phone: user.phone,
                nickname: user.nickname,
                role: user.role,
                lastLogin: user.lastLogin,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Logs in an existing user with phone and password.
// Requires validate(loginSchema) middleware - uses req.validated.
export const login = async (req, res, next) => {
    try {
        const { phone, password } = req.validated;

        const user = await User.findOne({ phone }).select("+password");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
        }

        if (user.password !== password) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
        }

        if (user.isBanned) {
            return res.status(403).json({
                success: false,
                message: "Your account has been banned. Please contact support.",
            });
        }

        user.lastLogin = Date.now();
        await user.save();

        res.status(200).json({
            success: true,
            token: generateToken(user._id),
            data: {
                id: user._id,
                phone: user.phone,
                nickname: user.nickname,
                role: user.role,
                lastLogin: user.lastLogin,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Returns the authenticated user's wallet balance only.
export const getWalletBalance = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select("walletBalance");
        res.status(200).json({
            success: true,
            data: { balance: user?.walletBalance ?? 0 },
        });
    } catch (error) {
        next(error);
    }
};

// Changes the authenticated admin's password.
export const changePassword = async (req, res, next) => {
    try {
        const { newPassword } = req.body;

        if (!newPassword) {
            return res.status(400).json({ success: false, message: "newPassword is required" });
        }

        const user = await User.findById(req.user.id);
        user.password = newPassword;
        await user.save();

        res.status(200).json({ success: true, message: "Password updated successfully" });
    } catch (error) {
        next(error);
    }
};

// Updates the authenticated user's nickname.
export const updateNickname = async (req, res, next) => {
    try {
        const { nickname } = req.body;

        if (!nickname || typeof nickname !== "string" || !nickname.trim()) {
            return res.status(400).json({ success: false, message: "nickname is required" });
        }

        const trimmed = nickname.trim();

        const existing = await User.findOne({ nickname: trimmed });
        if (existing && existing._id.toString() !== req.user.id) {
            return res.status(409).json({ success: false, message: "Nickname already taken" });
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { nickname: trimmed },
            { new: true }
        );

        res.status(200).json({
            success: true,
            data: { nickname: user.nickname },
        });
    } catch (error) {
        next(error);
    }
};

// Returns the currently authenticated user's profile.
export const getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        next(error);
    }
};
