import express from "express";
import authRoutes from "./authRoutes.js";
import winGoRoutes from "./winGoRoutes.js";

const routes = express.Router();

// Mounts all authentication-related routes under /auth.
routes.use("/auth", authRoutes);

// WinGo betting routes.
routes.use("/WinGo", winGoRoutes);

// Simple health/welcome endpoint for the API root.
routes.get("/", (req, res) => {
  res.json({ message: "Welcome to the API!" });
});

export default routes;

