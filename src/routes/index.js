import { Elysia } from "elysia";
import healthRoutes from "./health.routes.js";
import apiRoutes from "./api.routes.js";

const routes = new Elysia()
  .use(healthRoutes)
  .use(apiRoutes);

export default routes;
