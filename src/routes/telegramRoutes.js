import express from "express";
import { getTelegram, upsertTelegram, deleteTelegram } from "../controllers/telegramController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public — anyone can fetch the telegram URL
router.get("/", getTelegram);

// Admin only — upsert or remove
router.put("/", protect, authorize("admin"), upsertTelegram);
router.delete("/", protect, authorize("admin"), deleteTelegram);

export default router;
