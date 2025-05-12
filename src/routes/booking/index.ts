// src/routes/booking/index.ts
import { Hono } from "hono";
import { bookings } from "../../db/schema/bookings";
import { and, eq } from "drizzle-orm";
import { jwt } from "hono/jwt";
import db from "../../db";
import { getUser } from "../auth/functions";
import { stays } from "../../db/schema";

const JWT_SECRET = process.env.JWT_SECRET!;

const bookingRoutes = new Hono()
  .post(
    "/",
    jwt({
      secret: JWT_SECRET,
    }),
    async (c) => {
      try {
        const userId = c.get("jwtPayload").userId;
        const body = await c.req.json();

        // Explicitly type the booking data
        const bookingData = {
          userId,
          stayId: body.stayId as string,
          checkInDate: new Date(body.checkInDate),
          checkOutDate: new Date(body.checkOutDate),
          guests: Number(body.guests),
          totalPrice: Number(body.totalPrice),
          status: "pending" as const, // Explicitly set as pending status
        };

        const [booking] = await db
          .insert(bookings)
          .values(bookingData)
          .returning();

        return c.json({ message: "Booking created", data: booking });
      } catch (error) {
        console.error("Booking error:", error);
        return c.json({ message: "Failed to create booking" }, 500);
      }
    }
  )
  .get(
    "/",
    jwt({
      secret: JWT_SECRET,
    }),
    getUser,
    async (c) => {
      try {
        const loggedInUser = c.get("user");
        const userId = loggedInUser.id;
        const userBookings = await db
          .select({
            id: bookings.id,
            checkInDate: bookings.checkInDate,
            checkOutDate: bookings.checkOutDate,
            guests: bookings.guests,
            totalPrice: bookings.totalPrice,
            status: bookings.status,
            stay: {
              id: stays.id,
              title: stays.title,
              pricePerNight: stays.pricePerNight,
              // Explicitly exclude location field
              // Add other stay fields you need
            },
          })
          .from(bookings)
          .leftJoin(stays, eq(bookings.stayId, stays.id))
          .where(eq(bookings.userId, userId));

        return c.json({ message: "Bookings fetched", data: userBookings });
      } catch (error) {
        console.error("Fetch bookings error:", error);
        return c.json({ message: "Failed to fetch bookings" }, 500);
      }
    }
  );

export default bookingRoutes;
