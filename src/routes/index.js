import express from "express";
import authRoutes from "./authRoutes.js";
import winGoRoutes from "./winGoRoutes.js";
import promotionRoutes from "./promotionRoutes.js";

const routes = express.Router();

// Mounts all authentication-related routes under /auth.
routes.use("/auth", authRoutes);

// WinGo betting routes.
routes.use("/WinGo", winGoRoutes);

// Promotion/bonus routes.
routes.use("/promotion", promotionRoutes);

// Simple health/welcome endpoint for the API root.
routes.get("/", (req, res) => {
  res.json({ message: "Welcome to the API!" });
});

export default routes;

