import express from "express";
import { generateGiftCodes, listGiftCodes, deleteGiftCode, claimGiftCode } from "../controllers/giftCodeController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// User route — requires login only
router.get("/claim", protect, claimGiftCode);

// Admin-only routes
router.use(protect, authorize("admin"));
router.post("/generate", generateGiftCodes);
router.get("/", listGiftCodes);
router.delete("/:id", deleteGiftCode);

export default router;
