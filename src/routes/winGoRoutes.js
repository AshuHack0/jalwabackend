import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { placeBetSchema } from "../validations/winGoValidations.js";
import { placeBet, getCurrentRound, getGameHistory, getMyHistory, getAdminPrediction, setAdminPrediction, unsetAdminPrediction, getNextPrediction, setNextPrediction, unsetNextPrediction } from "../controllers/winGoController.js";
import { authorize } from "../middleware/authMiddleware.js";

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

// Admin-only: get/set/unset the forced outcome number for current round
router.get("/WinGo_30S/prediction", protect, authorize("admin"), getAdminPrediction);
router.patch("/WinGo_30S/prediction", protect, authorize("admin"), setAdminPrediction);
router.delete("/WinGo_30S/prediction", protect, authorize("admin"), unsetAdminPrediction);

router.get("/WinGo_1Min/prediction", protect, authorize("admin"), getAdminPrediction);
router.patch("/WinGo_1Min/prediction", protect, authorize("admin"), setAdminPrediction);
router.delete("/WinGo_1Min/prediction", protect, authorize("admin"), unsetAdminPrediction);

router.get("/WinGo_3Min/prediction", protect, authorize("admin"), getAdminPrediction);
router.patch("/WinGo_3Min/prediction", protect, authorize("admin"), setAdminPrediction);
router.delete("/WinGo_3Min/prediction", protect, authorize("admin"), unsetAdminPrediction);

router.get("/WinGo_5Min/prediction", protect, authorize("admin"), getAdminPrediction);
router.patch("/WinGo_5Min/prediction", protect, authorize("admin"), setAdminPrediction);
router.delete("/WinGo_5Min/prediction", protect, authorize("admin"), unsetAdminPrediction);

// Admin: get/set/unset the displayed prediction (BIG/SMALL) for the NEXT scheduled round
router.get("/WinGo_30S/nextPrediction", protect, authorize("admin"), getNextPrediction);
router.patch("/WinGo_30S/nextPrediction", protect, authorize("admin"), setNextPrediction);
router.delete("/WinGo_30S/nextPrediction", protect, authorize("admin"), unsetNextPrediction);

router.get("/WinGo_1Min/nextPrediction", protect, authorize("admin"), getNextPrediction);
router.patch("/WinGo_1Min/nextPrediction", protect, authorize("admin"), setNextPrediction);
router.delete("/WinGo_1Min/nextPrediction", protect, authorize("admin"), unsetNextPrediction);

router.get("/WinGo_3Min/nextPrediction", protect, authorize("admin"), getNextPrediction);
router.patch("/WinGo_3Min/nextPrediction", protect, authorize("admin"), setNextPrediction);
router.delete("/WinGo_3Min/nextPrediction", protect, authorize("admin"), unsetNextPrediction);

router.get("/WinGo_5Min/nextPrediction", protect, authorize("admin"), getNextPrediction);
router.patch("/WinGo_5Min/nextPrediction", protect, authorize("admin"), setNextPrediction);
router.delete("/WinGo_5Min/nextPrediction", protect, authorize("admin"), unsetNextPrediction);


export default router;
