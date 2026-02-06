import express from "express";
import authRoutes from "./authRoutes.js";

const routes = express.Router();

routes.use("/auth", authRoutes);

routes.get("/", (req, res) => {
  res.json({ message: "Welcome to the API!" });
});

export default routes;

