import express from "express";
import { initiateMcgindiamcDeposit, getMcgindiamcDepositStatus, getMcgindiamcMyDeposits } from "../controllers/mcgindiamcDepositController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { initiateDepositSchema } from "../validations/depositValidations.js";

const router = express.Router();

// All deposit routes require authentication
router.use(protect);

// POST /api/v1/deposits/initiate — create a real-money deposit via payment gateway
router.post("/initiate", validate(initiateDepositSchema), initiateMcgindiamcDeposit);

// GET /api/v1/deposits/my — authenticated user's deposit history
router.get("/my", getMcgindiamcMyDeposits);

// GET /api/v1/deposits/status/:merchantOrderNo — poll deposit status
router.get("/status/:merchantOrderNo", getMcgindiamcDepositStatus);

export default router;
