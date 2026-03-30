import express from "express";
import { handlePaymentCallback } from "../controllers/paymentCallbackController.js";

const router = express.Router();

// POST /api/v1/payments/callback — deposit callback from gateway
router.post("/callback", handlePaymentCallback);

export default router;
