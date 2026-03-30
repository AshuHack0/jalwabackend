import express from "express";
import { handleMcgCallback, handleOxoxmgCallback, handleUsdtCallback } from "../controllers/callbackController.js";

const router = express.Router();

// POST /api/v1/payments/mcgindiamc-callback — deposit callback from Mcgindiamc
router.post("/mcgindiamc-callback", handleMcgCallback);

// POST /api/v1/payments/oxoxmg-callback — deposit callback from Oxoxmg
router.post("/oxoxmg-callback", handleOxoxmgCallback);

// POST /api/v1/payments/usdt-callback — deposit callback from USDT gateway
router.post("/usdt-callback", handleUsdtCallback);

export default router;
