import express from "express";
import {
  initiateUsdtDeposit,
  getUsdtDepositStatus,
  getMyUsdtDeposits,
} from "../controllers/usdtDepositController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { initiateUsdtDepositSchema } from "../validations/depositValidations.js";

const router = express.Router();

router.use(protect);

// POST /api/v1/usdt/deposits/initiate — create a USDT deposit, returns wallet address
router.post("/initiate", validate(initiateUsdtDepositSchema), initiateUsdtDeposit);

// GET /api/v1/usdt/deposits/my — authenticated user's USDT deposit history
router.get("/my", getMyUsdtDeposits);

// GET /api/v1/usdt/deposits/status/:merchantOrderNo — poll deposit status
router.get("/status/:merchantOrderNo", getUsdtDepositStatus);

export default router;
