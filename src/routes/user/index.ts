import { Hono } from "hono";
import { getUser } from "../auth/functions";
import { zValidator } from "@hono/zod-validator";
import z from "zod";
import db from "../../db";
import { applyForAgentSchema, users } from "../../db/schema";
import { agents } from "../../db/schema/agents";
import { jwt, type JwtVariables } from "hono/jwt";
import { agentLocations } from "../../db/schema/agent_locations";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET!;

type Variables = JwtVariables<{ userId: string }>;

const extendedSchema = applyForAgentSchema.extend({
  locations: z.array(
    z.object({
      latitude: z.number(),
      longitude: z.number(),
      label: z.string().optional(),
    })
  ),
});

const userRoute = new Hono<{ Variables: Variables }>()
  .use(
    "*",
    jwt({
      secret: JWT_SECRET,
    }),
    getUser
  )
  .get(async (c) => {
    try {
      const user = c.get("user");
      return c.json({ message: "user fetched successfully", data: user });
    } catch (error) {
      return c.json({ message: "failed to fetch user" }, 500);
    }
  })
  .post(
    "/upload_id",
    zValidator("json", z.object({ id_key: z.string() })),
    async (c) => {
      try {
        const { id_key } = c.req.valid("json");
        await db.update(users).set({ governmentId: id_key, verified: true });
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
  .post("/apply_for_agent", zValidator("json", extendedSchema), async (c) => {
    try {
      const loggedInUser = c.get("user");
      const data = c.req.valid("json");

      if (loggedInUser.isAgent) {
        return c.json(
          {
            message:
              "You have already been approved as an agent. No need to apply again.",
          },
          409
        );
      }

      // Insert agent details
      await db.insert(agents).values({
        userid: loggedInUser.id,
        agencyName: data.agencyName,
        about: data.about,
        membership: data.membership,
        servicesOffered: data.servicesOffered,
      });

      // Insert multiple locations
      await Promise.all(
        data.locations.map((loc) =>
          db.insert(agentLocations).values({
            agentId: loggedInUser.id,
            location: {
              x: loc.longitude,
              y: loc.latitude,
            },
            label: loc.label,
          })
        )
      );

      // Update user as agent
      await db
        .update(users)
        .set({ isAgent: true })
        .where(eq(users.id, loggedInUser.id));
      return c.json({
        message:
          "You have successfully applied to be an agent. You will be verified by our team shortly.",
      });
    } catch (error) {
      console.error(error);
      return c.json({ message: "Failed to get you onboard as an agent" }, 500);
    }
  })
  .post("/upgrade/membership")
  .get("/my-bookings");

export default userRoute;
