import express from "express";
import { generateGiftCodes, listGiftCodes, deleteGiftCode } from "../controllers/giftCodeController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, authorize("admin"));

router.post("/generate", generateGiftCodes);
router.get("/", listGiftCodes);
router.delete("/:id", deleteGiftCode);

export default router;
