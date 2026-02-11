import express from "express";
import {
    register,
    login,
    getMe,
    getWalletBalance,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { registerSchema, loginSchema } from "../validations/authValidations.js";

const router = express.Router();

// Handles user registration.
router.post("/register", validate(registerSchema), register);

// Handles user login.
router.post("/login", validate(loginSchema), login);

// Returns authenticated user's information.
router.get("/me", protect, getMe);

// Returns authenticated user's wallet balance only.
router.get("/wallet", protect, getWalletBalance);

export default router;
