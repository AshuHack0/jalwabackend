import express from "express";
import { handlePaymentCallback, handlePayoutCallback } from "../controllers/paymentCallbackController.js";

const router = express.Router();

// POST /api/v1/payments/callback — deposit callback from gateway
router.post("/callback", handlePaymentCallback);

// POST /api/v1/payments/payout-callback — payout (withdrawal) callback from gateway
router.post("/payout-callback", handlePayoutCallback);

export default router;
