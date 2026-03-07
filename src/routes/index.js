import express from "express";
import authRoutes from "./authRoutes.js";
import winGoRoutes from "./winGoRoutes.js";
import promotionRoutes from "./promotionRoutes.js";
import telegramRoutes from "./telegramRoutes.js";
import giftCodeRoutes from "./giftCodeRoutes.js";
import userAdminRoutes from "./userAdminRoutes.js";
import bonusRoutes from "./bonusRoutes.js";
import depositAdminRoutes from "./depositAdminRoutes.js";
import withdrawalRoutes from "./withdrawalRoutes.js";

const routes = express.Router();

// Mounts all authentication-related routes under /auth.
routes.use("/auth", authRoutes);

// WinGo betting routes.
routes.use("/WinGo", winGoRoutes);

// Promotion/bonus routes.
routes.use("/promotion", promotionRoutes);

// Telegram config routes.
routes.use("/telegram", telegramRoutes);

// Gift code routes.
routes.use("/gift-codes", giftCodeRoutes);

// User admin routes.
routes.use("/users", userAdminRoutes);

// Bonus routes.
routes.use("/bonus", bonusRoutes);

// Deposit admin routes.
routes.use("/admin/deposits", depositAdminRoutes);

// Withdrawal routes.
routes.use("/withdrawals", withdrawalRoutes);

// Simple health/welcome endpoint for the API root.
routes.get("/", (req, res) => {
  res.json({ message: "Welcome to the API!" });
});

export default routes;

