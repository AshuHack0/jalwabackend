import express from "express";

const routes = express.Router();

routes.get("/", (req, res) => {
  res.json({ message: "Welcome to the API!" });
});

export default routes;
