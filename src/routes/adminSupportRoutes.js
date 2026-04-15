import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { listTickets, updateTicketStatus } from "../controllers/adminSupportController.js";

const router = express.Router();

router.use(protect, authorize("admin"));

router.get("/", listTickets);
router.patch("/:id/status", updateTicketStatus);

export default router;
