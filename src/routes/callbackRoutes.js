import express from "express";
import { handleMcgCallback, handleOxoxmgCallback } from "../controllers/callbackController.js";

const router = express.Router();

// POST /api/v1/payments/mcgindiamc-callback — deposit callback from Mcgindiamc
router.post("/mcgindiamc-callback", handleMcgCallback);

// POST /api/v1/payments/oxoxmg-callback — deposit callback from Oxoxmg
router.post("/oxoxmg-callback", handleOxoxmgCallback);

export default router;
