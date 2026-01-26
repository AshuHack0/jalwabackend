import { Elysia } from "elysia";
import { exampleController } from "../controllers/example.controller.js";

const apiRoutes = new Elysia({ prefix: "/api" })
  .get("/example", exampleController.getExample)
  .post("/example", exampleController.createExample);

export default apiRoutes;
