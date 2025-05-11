import { Hono } from "hono";
import db from "../../db";
import z, { number } from "zod";
import { zValidator } from "@hono/zod-validator";
import { getAuthenticatedUser, getUser } from "../auth/functions";
import { createStaySchema, stays, updateStaySchema } from "../../db/schema";
import { eq } from "drizzle-orm";
import { jwt, type JwtVariables } from "hono/jwt";

const getStaysQuery = z.object({
  page: z.string().min(1).default("1").optional(),
  limit: z.string().min(2).default("10").optional(),
});
const JWT_SECRET = process.env.JWT_SECRET!;

type Variables = JwtVariables<{ userId: string }>;
const stayRoute = new Hono()
  .get("/", zValidator("query", getStaysQuery), async (c) => {
    try {
      const { page, limit } = c.req.valid("query");
      const stays = await db.query.stays.findMany({
        columns: {
          id: true,
          perks: true,
          title: true,
          rating: true,
          pricePerNight: true,
          baseGuest: true,
          displayImages: true,
          discount: true,
          location: true,
        },
        limit: Number(limit),
      });
      return c.json({ message: "Fetched stays", data: stays });
    } catch (error) {
      return c.json({ message: "Failed to fetch stays" }, 500);
    }
  })
  .get(
    "/:id",
    zValidator("param", z.object({ id: z.string().uuid() })),
    async (c) => {
      try {
        const { id } = c.req.valid("param");
        const stay = await db.query.stays.findFirst({
          where: (stays, { eq }) => eq(stays.id, id),
        });
        if (!stay) {
          return c.json({ message: "Stay not found" }, 404);
        }
        return c.json({ message: "Fetched stay", data: stay });
      } catch (error) {
        return c.json({ message: "Failed to fetch stays" }, 500);
      }
    }
  )
  .post(
    "/",
    jwt({
      secret: JWT_SECRET,
    }),
    getUser,
    async (c) => {
      try {
        const loggedInUser = c.get("user");
        if (!loggedInUser.isAgent) {
          return c.json({ message: "Only agents can create stays" }, 403);
        }
        const createdStay = (
          await db.insert(stays).values({ hostId: loggedInUser.id }).returning()
        )[0];
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
    jwt({
      secret: JWT_SECRET,
    }),
    getUser,
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
  .patch(
    "/",
    jwt({
      secret: JWT_SECRET,
    }),
    getUser,
    zValidator("json", updateStaySchema),
    async (c) => {
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
    }
  )
  .patch(
    "/publish",
    jwt({
      secret: JWT_SECRET,
    }),
    getUser,
    zValidator("json", z.object({ id: z.string() })),
    async (c) => {
      try {
        const { id } = c.req.valid("json");
        const loggedInUser = c.get("user");

        if (!loggedInUser.isAgent) {
          return c.json({ message: "Only agents can update stays" }, 403);
        }

        const stay = await db.query.stays.findFirst({
          where: (stays, { eq, and }) =>
            and(eq(stays.id, id), eq(stays.hostId, loggedInUser.id)),
        });

        if (!stay) {
          return c.json({ message: "Stay not found" }, 404);
        }

        // Perform required field validation
        const missingFields = [];

        if (!stay.title) missingFields.push("title");
        if (!stay.description) missingFields.push("description");
        if (!stay.location || !stay.location.x || !stay.location.y)
          missingFields.push("location");
        if (!stay.displayImages || stay.displayImages.length < 1)
          missingFields.push("minimum 5 displayImages");
        if (!stay.perks || stay.perks.length < 1) missingFields.push("perks");
        if (!stay.baseGuest) missingFields.push("baseGuest");
        if (!stay.bedrooms) missingFields.push("bedrooms");
        if (!stay.bathrooms) missingFields.push("bathrooms");
        if (!stay.pricePerNight) missingFields.push("pricePerNight");
        if (!stay.perPersonIncrement) missingFields.push("perPersonIncrement");
        if (!stay.maxOccupancy) missingFields.push("maxOccupancy");
        if (!stay.amenities || stay.amenities.length === 0)
          missingFields.push("amenities");
        if (!stay.typeOfStay) missingFields.push("typeOfStay");
        if (!stay.propertyAccess) missingFields.push("propertyAccess");

        // Check address validity
        const addr = stay.address;
        if (!addr) {
          missingFields.push("address");
        }

        if (missingFields.length > 0) {
          return c.json(
            {
              message: "Cannot publish stay. Missing or invalid fields.",
              missingFields,
            },
            400
          );
        }

        await db
          .update(stays)
          .set({ isPublished: true, availability: true })
          .where(eq(stays.id, id));

        return c.json({ message: "Stay published successfully" });
      } catch (error) {
        console.error("Error publishing stay:", error);
        return c.json({ message: "Internal server error" }, 500);
      }
    }
  );
export default stayRoute;
