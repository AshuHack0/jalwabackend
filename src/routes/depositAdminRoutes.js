import express from "express";
import { listDeposits, approveDeposit, rejectDeposit } from "../controllers/depositAdminController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, authorize("admin"));

router.get("/", listDeposits);
router.patch("/:id/approve", approveDeposit);
router.patch("/:id/reject", rejectDeposit);

export default router;
