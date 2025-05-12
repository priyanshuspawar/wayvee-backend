import { Hono } from "hono";
import { getUser } from "../auth/functions";
import { zValidator } from "@hono/zod-validator";
import z from "zod";
import db from "../../db";
import { jwt, type JwtVariables } from "hono/jwt";
import { wishlist, wishlistSchema } from "../../db/schema/wishlist";
import { stays } from "../../db/schema/stays";

const JWT_SECRET = process.env.JWT_SECRET!;

type Variables = JwtVariables<{ userId: string }>;

const whishlistRoute = new Hono<{ Variables: Variables }>()
  .use(
    "*",
    jwt({
      secret: JWT_SECRET,
    }),
    getUser
  )
  .get("/", async (c) => {
    try {
      const loggedInUser = c.get("user");
      // Get all wishlisted stay IDs for the current user
      const wishlistItems = await db.query.wishlist.findMany({
        where: (wishlist, { eq }) => eq(wishlist.userId, loggedInUser.id),
        columns: { stayId: true }, // Only fetch stay IDs
      });

      // Extract just the stay IDs into a Set for efficient lookup
      const wishlistedStayIds = new Set(
        wishlistItems.map((item) => item.stayId)
      );

      // Fetch all published stays with wishlist status
      const stays = await db.query.stays.findMany({
        where: (stays, { eq }) => eq(stays.isPublished, true),
        // Add any other filters or pagination you need
      });

      // Add wishlisted flag to each stay
      const staysWithWishlistFlag = stays.map((stay) => ({
        ...stay,
        wishlisted: wishlistedStayIds.has(stay.id),
      }));

      return c.json({
        message: "Successfully fetched stays",
        data: staysWithWishlistFlag,
      });
    } catch (error) {
      return c.json(
        {
          message: "Failed to upload your id please try again or contact us",
        },
        500
      );
    }
  })
  .post("/", zValidator("json", wishlistSchema), async (c) => {
    try {
      const data = c.req.valid("json");
      await db.insert(wishlist).values(data);
      return c.json({
        message: "added to wishlist",
      });
    } catch (error) {
      return c.json(
        {
          message: "Failed to upload your id please try again or contact us",
        },
        500
      );
    }
  });

export default whishlistRoute;
