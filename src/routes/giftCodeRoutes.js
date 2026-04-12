import express from "express";
import {
    generateGiftCodes,
    listGiftCodes,
    deleteGiftCode,
    claimGiftCode,
    getMyCode,
    redeemGiftCode,
    getRedemptionHistory,
} from "../controllers/giftCodeController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// User routes — requires login only
router.get("/claim", protect, claimGiftCode);
router.get("/my-code", protect, getMyCode);
router.post("/redeem", protect, redeemGiftCode);
router.get("/history", protect, getRedemptionHistory);

// Admin-only routes
router.use(protect, authorize("admin"));
router.post("/generate", generateGiftCodes);
router.get("/", listGiftCodes);
router.delete("/:id", deleteGiftCode);

export default router;
