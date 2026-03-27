import express from "express";
import {
  listWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  initiateWithdrawal,
  getMyWithdrawals,
} from "../controllers/withdrawalController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// User-facing routes (authenticated users)
router.post("/initiate", protect, initiateWithdrawal);
router.get("/my", protect, getMyWithdrawals);

// Admin routes
router.get("/", protect, authorize("admin"), listWithdrawals);
router.patch("/:id/approve", protect, authorize("admin"), approveWithdrawal);
router.patch("/:id/reject", protect, authorize("admin"), rejectWithdrawal);

export default router;
