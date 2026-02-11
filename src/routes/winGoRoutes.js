import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { placeBetSchema } from "../validations/winGoValidations.js";
import { placeBet, getGameByDuration } from "../controllers/winGoController.js";

const router = express.Router();

router.post("/placeBet", protect, validate(placeBetSchema), placeBet);

router.get("/WinGo_30S", getGameByDuration);
router.get("/WinGo_1Min", getGameByDuration);
router.get("/WinGo_3Min", getGameByDuration);
router.get("/WinGo_5Min", getGameByDuration);

export default router;
