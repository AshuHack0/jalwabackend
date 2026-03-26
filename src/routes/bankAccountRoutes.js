import express from "express";
import { addBankAccount, getBankAccount } from "../controllers/bankAccountController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All bank account routes require authentication
router.use(protect);

// GET /api/v1/bank-account — get current user's saved bank account
router.get("/", getBankAccount);

// POST /api/v1/bank-account — add or update current user's bank account
router.post("/", addBankAccount);

export default router;
