import { Hono } from "hono";
import { jwt, type JwtVariables } from "hono/jwt";
import { getUser } from "../auth/functions";
import { zValidator } from "@hono/zod-validator";
import z from "zod";
import pusher from "../../services/pusher";

const JWT_SECRET = process.env.JWT_SECRET!;

type Variables = JwtVariables<{ userId: string }>;

const pusherRoute = new Hono<{ Variables: Variables }>()
  .use(
    "*",
    jwt({
      secret: JWT_SECRET,
    }),
    getUser
  )
  .post(
    "/auth",
    zValidator(
      "json",
      z.object({
        socket_id: z.string(),
        channel_name: z.string(),
      })
    ),
    async (c) => {
      try {
        const loggedInUser = c.get("user");
        const { socket_id, channel_name } = c.req.valid("json");

        // Verify this user has access to the requested channel
        if (channel_name.startsWith("private-user-")) {
          const channelUserId = channel_name.replace("private-user-", "");

          // Only allow authentication for the user's own private channel
          if (channelUserId !== loggedInUser.id) {
            return c.json(
              { message: "Not authorized to access this channel" },
              403
            );
          }
        }

        // Generate auth signature
        const authResponse = pusher.authorizeChannel(socket_id, channel_name);

        return c.json(authResponse);
      } catch (error) {
        console.error("Error authenticating Pusher channel:", error);
        return c.json({ message: "Failed to authenticate channel" }, 500);
      }
    }
  );

export default pusherRoute;
