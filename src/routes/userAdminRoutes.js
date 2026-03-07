import express from "express";
import { listUsers, toggleBan, deleteUser, getUserByPhone, updateBankDetails, listUsersWithBankDetails } from "../controllers/userAdminController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, authorize("admin"));

router.get("/", listUsers);
router.get("/by-phone", getUserByPhone);
router.get("/bank-details", listUsersWithBankDetails);
router.patch("/:id/ban", toggleBan);
router.patch("/:id/bank", updateBankDetails);
router.delete("/:id", deleteUser);

export default router;
