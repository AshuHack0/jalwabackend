import express from "express";
import { handlePaymentCallback } from "../controllers/paymentCallbackController.js";

const router = express.Router();

// POST /api/v1/payments/callback — called by the payment gateway (no JWT auth, signature verified internally)
router.get("/callback", handlePaymentCallback);

export default router;
