import express from "express";
import authRoutes from "./authRoutes.js";
import customerSupportRoutes from "./customerSupportRoutes.js";
import winGoRoutes from "./winGoRoutes.js";
import promotionRoutes from "./promotionRoutes.js";
import telegramRoutes from "./telegramRoutes.js";
import giftCodeRoutes from "./giftCodeRoutes.js";
import userAdminRoutes from "./userAdminRoutes.js";
import bonusRoutes from "./bonusRoutes.js";
import depositAdminRoutes from "./depositAdminRoutes.js";
import withdrawalRoutes from "./withdrawalRoutes.js";
import mcgindiamcDepositRoutes from "./mcgindiamcDepositRoutes.js";
import callbackRoutes from "./callbackRoutes.js";
import bankAccountRoutes from "./bankAccountRoutes.js";
import oxoxmgDepositRoutes from "./oxoxmgDepositRoutes.js";
import usdtDepositRoutes from "./usdtDepositRoutes.js";
import adminSupportRoutes from "./adminSupportRoutes.js";

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

// Mcgindiamc deposit routes.
routes.use("/deposits", mcgindiamcDepositRoutes);

// Payment gateway callback (no JWT auth — signature verified internally).
routes.use("/payments", callbackRoutes);

// Bank account routes (user-facing).
routes.use("/bank-account", bankAccountRoutes);

// Oxoxmg deposit routes.
routes.use("/oxoxmg/deposits", oxoxmgDepositRoutes);

// USDT deposit routes.
routes.use("/usdt/deposits", usdtDepositRoutes);

// Customer support routes.
routes.use("/customer-support", customerSupportRoutes);

// Admin support ticket management.
routes.use("/admin/support-tickets", adminSupportRoutes);

// Simple health/welcome endpoint for the API root.
routes.get("/", (_req, res) => {
  res.json({ message: "Welcome to the API!" });
});

export default routes;

