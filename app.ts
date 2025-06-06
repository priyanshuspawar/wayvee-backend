import dotenv from "dotenv";
dotenv.config({ path: "/" });
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import authRoute from "./src/routes/auth";
import redisClient from "./src/redis";
import userRoute from "./src/routes/user";
import uploadRoute from "./src/routes/upload";
import agentRoute from "./src/routes/agent";
import stayRoute from "./src/routes/stay";
import messageRoutes from "./src/routes/messages";
import pusherRoute from "./src/routes/pusher";
import whishlistRoute from "./src/routes/wishlist";
import bookingRoutes from "./src/routes/booking";

const app = new Hono();
await redisClient.connect().then(() => {
  console.log("Redis store connected");
});

// Added logger middleware to the app
app.use("*", logger());
app.use("/api/*", cors());

console.log("server running 🚀");
app.basePath("/api").route("/auth", authRoute);
app.basePath("/api").route("/upload", uploadRoute);
app.basePath("/api").route("/agent", agentRoute);
app.basePath("/api").route("/user", userRoute);
app.basePath("/api").route("/stays", stayRoute);
app.basePath("/api").route("/wishlist", whishlistRoute);
app.basePath("/api").route("/messages", messageRoutes);
app.basePath("/api").route("/bookings", bookingRoutes);
app.basePath("/api").route("/pusher", pusherRoute);

// app.use("*", serveStatic({ root: "../frontend/dist" }));
// app.get("*", serveStatic({ path: "../frontend/dist/index.html" }));

export default app;
// export type ApiRoutes = typeof ApiRoutes;
