import { Hono } from "hono";
import db from "../../db";
import z, { number } from "zod";
import { zValidator } from "@hono/zod-validator";
import { getAuthenticatedUser } from "../auth/functions";
import { createStaySchema, stays, updateStaySchema } from "../../db/schema";
import { eq } from "drizzle-orm";

const getStaysQuery = z.object({
  page: z.string().min(1).default("1").optional(),
  limit: z.string().min(2).default("10").optional(),
});

const stayRoute = new Hono()
  .get("/", zValidator("query", getStaysQuery), async (c) => {
    try {
      const { page, limit } = c.req.valid("query");
      const stays = await db.query.stays.findMany({ limit: Number(limit) });
      return c.json({ message: "Fetched stays", data: stays });
    } catch (error) {
      return c.json({ message: "Failed to fetch stays" }, 500);
    }
  })
  .post(
    getAuthenticatedUser,
    zValidator("json", createStaySchema),
    async (c) => {
      try {
        const loggedInUser = c.get("user");
        if (!loggedInUser.isAgent) {
          return c.json({ message: "Only agents can create stays" }, 403);
        }
        const stayData = c.req.valid("json");
        const createdStay = await db
          .insert(stays)
          .values({ hostId: loggedInUser.id, ...stayData })
          .returning();
        return c.json({
          message: "Stay created successfully",
          data: createdStay,
        });
      } catch (error) {
        return c.json({ message: "Failed to create stay" }, 500);
      }
    }
  )
  .delete(
    "/",
    zValidator("json", z.object({ stayId: z.string().uuid() })),
    async (c) => {
      try {
        const { stayId } = c.req.valid("json");
        if (!stayId) {
          return c.json({ message: "Stay id is required" }, 400);
        }
        const loggedInUser = c.get("user");
        if (!loggedInUser.isAgent) {
          return c.json({ message: "Only agents can delete stays" }, 403);
        }
        const stay = await db.query.stays.findFirst({
          where: (stays, { eq, and }) =>
            and(eq(stays.id, stayId), eq(stays.hostId, loggedInUser.id)),
        });
        if (!stay) {
          return c.json({ message: "Stay not found" }, 404);
        }
        await db.delete(stays).where(eq(stays.id, stayId));
        return c.json({ message: "Stay deleted successfully" });
      } catch (error) {
        return c.json({ message: "Failed to delete stay" }, 500);
      }
    }
  )
  .patch("/", zValidator("json", updateStaySchema), async (c) => {
    try {
      const loggedInUser = c.get("user");
      if (!loggedInUser.isAgent) {
        return c.json({ message: "Only agents can update stays" }, 403);
      }
      const stayData = c.req.valid("json");
      const stay = await db.query.stays.findFirst({
        where: (stays, { eq, and }) =>
          and(eq(stays.id, stayData.id), eq(stays.hostId, loggedInUser.id)),
      });
      if (!stay) {
        return c.json({ message: "Stay not found" }, 404);
      }
      await db.update(stays).set(stayData).where(eq(stays.id, stayData.id));
      return c.json({ message: "Stay updated successfully" });
    } catch (error) {
      return c.json({ message: "Failed to update stay" }, 500);
    }
  });

export default stayRoute;
