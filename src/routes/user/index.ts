import { Hono } from "hono";
import { getAuthenticatedUser } from "../auth/functions";
import { zValidator } from "@hono/zod-validator";
import z from "zod";
import db from "../../db";
import { applyForAgentSchema, users } from "../../db/schema";
import { agents } from "../../db/schema/agents";

const userRoute = new Hono()
  .get(getAuthenticatedUser, async (c) => {
    try {
      const user = c.get("user");
      return c.json({ message: "user fetched successfully", data: user });
    } catch (error) {
      return c.json({ message: "failed to fetch user" }, 500);
    }
  })
  .post(
    "/upload_id",
    getAuthenticatedUser,
    zValidator("json", z.object({ id_key: z.string() })),
    async (c) => {
      try {
        const { id_key } = c.req.valid("json");
        await db.update(users).set({ governmentId: id_key });
        return c.json({
          message:
            "Uploaded successfully please wait till we verify your details",
        });
      } catch (error) {
        return c.json(
          {
            message: "Failed to upload your id please try again or contact us",
          },
          500
        );
      }
    }
  )
  .post(
    "/apply_for_agent",
    getAuthenticatedUser,
    zValidator("json", applyForAgentSchema),
    async (c) => {
      try {
        const loggedInUser = c.get("user");
        const data = c.req.valid("json");
        if (loggedInUser.isAgent) {
          return c.json(
            {
              message:
                "You have already been approved as a agent. No need to apply again",
            },
            409
          );
        }
        await db.insert(agents).values({ userid: loggedInUser.id, ...data });
        await db.update(users).set({ isAgent: true });
        return c.json({
          message:
            "You have successfully applied to be a agent you be verified by our team shortly",
        });
      } catch (error) {
        console.error(error);
        return c.json({ message: "Failed to get you onboard as a agent" }, 500);
      }
    }
  )
  .post("/upgrade/membership", getAuthenticatedUser)
  .get("/my-bookings", getAuthenticatedUser);

export default userRoute;
