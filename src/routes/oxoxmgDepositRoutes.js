import express from "express";
import { initiateOxoxmgDeposit, getOxoxmgDepositStatus } from "../controllers/oxoxmgDepositController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

// POST /api/v1/oxoxmg/deposits/initiate — user initiates a deposit via Oxoxmg
router.post("/initiate", initiateOxoxmgDeposit);

// GET /api/v1/oxoxmg/deposits/status/:merchantOrderNo — poll deposit status
router.get("/status/:merchantOrderNo", getOxoxmgDepositStatus);

export default router;
