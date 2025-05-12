import { pgTable, uuid, timestamp, text, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { stays } from "./stays";

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  stayId: uuid("stay_id")
    .notNull()
    .references(() => stays.id),
  checkInDate: timestamp("check_in_date").notNull(),
  checkOutDate: timestamp("check_out_date").notNull(),
  guests: integer("guests").notNull(),
  totalPrice: integer("total_price").notNull(),
  status: text("status")
    .$type<"pending" | "confirmed" | "cancelled">()
    .default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const bookingsRelations = relations(bookings, ({ one }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  stay: one(stays, {
    fields: [bookings.stayId],
    references: [stays.id],
  }),
}));

// Zod validation schema
import { createInsertSchema } from "drizzle-zod";
export const bookingSchema = createInsertSchema(bookings);
