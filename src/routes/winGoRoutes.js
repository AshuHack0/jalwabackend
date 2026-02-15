import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { placeBetSchema } from "../validations/winGoValidations.js";
import { placeBet, getCurrentRound, getGameHistory, getMyHistory } from "../controllers/winGoController.js";

const router = express.Router();

router.post("/placeBet", protect, validate(placeBetSchema), placeBet);

// Lightweight: only current active round
router.get("/WinGo_30S", getCurrentRound);
router.get("/WinGo_1Min", getCurrentRound);
router.get("/WinGo_3Min", getCurrentRound);
router.get("/WinGo_5Min", getCurrentRound);

// Paginated history of past rounds
router.get("/WinGo_30S/history", getGameHistory);
router.get("/WinGo_1Min/history", getGameHistory);
router.get("/WinGo_3Min/history", getGameHistory);
router.get("/WinGo_5Min/history", getGameHistory);

router.get("/WinGo_30S/myHistory", protect, getMyHistory);
router.get("/WinGo_1Min/myHistory", protect, getMyHistory);
router.get("/WinGo_3Min/myHistory", protect, getMyHistory);
router.get("/WinGo_5Min/myHistory", protect, getMyHistory);

export default router;
