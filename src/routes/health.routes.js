import { Elysia } from "elysia";

const healthRoutes = new Elysia().get("/health", () => ({
  status: "ok",
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
}));

export default healthRoutes;
