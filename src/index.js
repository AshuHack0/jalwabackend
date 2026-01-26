import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import routes from "./routes/index.js";
import { morganMiddleware } from "./middleware/morgan.middleware.js";

const app = new Elysia()
  .use(cors())
  .use(morganMiddleware)
  .get("/", () => ({
    message: "Welcome to Jalwa Backend API",
    version: "1.0.0",
  }))
  .use(routes)
  .onError(({ code, error, set }) => {
    if (code === "NOT_FOUND") {
      set.status = 404;
      return {
        success: false,
        message: "Route not found",
      };
    }
    set.status = 500;
    return {
      success: false,
      message: error.message || "Internal server error",
    };
  })
  .listen(process.env.PORT || 3001);

console.log(
  `🦊 Server is running at http://${app.server?.hostname}:${app.server?.port}`
);

export default app;
