import express from "express";
import { getMyTransactions } from "../controllers/transactionController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/v1/transactions/my
router.get("/my", protect, getMyTransactions);

export default router;
