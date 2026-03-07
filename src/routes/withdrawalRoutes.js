import express from "express";
import { listWithdrawals, approveWithdrawal, rejectWithdrawal } from "../controllers/withdrawalController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, authorize("admin"));

router.get("/", listWithdrawals);
router.patch("/:id/approve", approveWithdrawal);
router.patch("/:id/reject", rejectWithdrawal);

export default router;
