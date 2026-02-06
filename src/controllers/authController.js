import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import User from "../models/User.js";
import { env } from "../config/env.js";

// Helper to create JWT
const generateToken = (id) => {
    return jwt.sign({ id }, env.JWT_SECRET, {
        expiresIn: env.JWT_EXPIRES_IN,
    });
};

export const register = async (req, res, next) => {
    try {
        const { phone, password, inviteCode } = req.body;

        if (!phone || !password) {
            return res.status(400).json({
                success: false,
                message: "Phone number and password are required",
            });
        }

        if (!inviteCode || inviteCode !== env.INVITE_CODE) {
            return res.status(400).json({
                success: false,
                message: "Invalid invite code",
            });
        }

        const userExists = await User.findOne({ phone });

        if (userExists) {
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


export const login = async (req, res, next) => {
    try {
        const { phone, password } = req.body;

        if (!phone || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide phone number and password",
            });
        }

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
