import express from "express";
import { assignBonus, listBonuses } from "../controllers/bonusController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, authorize("admin"));

router.post("/assign", assignBonus);
router.get("/", listBonuses);

export default router;
