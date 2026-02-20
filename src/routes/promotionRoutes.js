import express from "express";
import {
  getFirstDepositBonus,
  depositAsUser,
  recordDeposit,
  claimFirstDepositBonus,
} from "../controllers/promotionController.js";
import {
  optionalProtect,
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/v1/promotion/first-deposit-bonus (optional auth for user-specific progress)
router.get("/first-deposit-bonus", optionalProtect, getFirstDepositBonus);

// POST /api/v1/promotion/claim-first-deposit-bonus (auth required)
router.post("/claim-first-deposit-bonus", protect, claimFirstDepositBonus);

// POST /api/v1/promotion/deposit (auth required - user self-deposit)
router.post("/deposit", protect, depositAsUser);

// POST /api/v1/promotion/deposits (admin or internal - record completed deposit)
router.post("/deposits", protect, authorize("admin"), recordDeposit);

export default router;
