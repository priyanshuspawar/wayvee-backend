import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import authRoute from "./src/routes/auth";
const app = new Hono();

// Added logger middleware to the app
app.use("*", logger());
app.use("/api/*", cors());




console.log("server running 🚀")

const ApiRoutes = app.basePath("/api").route("/auth", authRoute);

// app.use("*", serveStatic({ root: "../frontend/dist" }));
// app.get("*", serveStatic({ path: "../frontend/dist/index.html" }));

export default app;
// export type ApiRoutes = typeof ApiRoutes;