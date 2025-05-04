import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  geometry,
  json,
  index,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";

import { users } from "./users";

export const stays = pgTable(
  "stays",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hostId: uuid("host_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    location: geometry("location", {
      type: "point",
      mode: "xy",
      srid: 4326,
    }).notNull(),
    displayImages: text("display_images").array().notNull(),
    roomsDescription: json("rooms_description")
      .$type<{
        id: string;
        roomName: string;
        bedtype: string | null;
        images: Array<{ key: string; url: string }>;
        bathroom_included: boolean;
      }>()
      .array()
      .notNull(),
    perks: text("perks").array().notNull(),
    baseGuest: integer("base_guest").notNull(),
    pricePerNight: decimal("price_per_night", {
      precision: 8,
      scale: 2,
    }).notNull(),
    perPersonIncrement: decimal("per_person_increment", {
      precision: 8,
      scale: 2,
    }).notNull(),
    maxOccupancy: integer("max_occupancy").notNull(),
    amenities: text("amenities").array().notNull(),
    availability: boolean("availability").notNull(),
    keyPoints: json("key_points")
      .$type<{
        houseRules: Array<{ key: string; rule: string }>;
        thingsToRemeber: Array<{ key: string; point: string }>;
        tips: Array<{ key: string; tip: string }>;
      }>()
      //TODO:fix typo thingsToRemeber to thingsToRemember
      .notNull(),
    rating: decimal("rating", { precision: 8, scale: 2 })
      .notNull()
      .default("0"),
    discount: decimal("discount", { precision: 8, scale: 2 }).default("0"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("stays_spatial_index").using("gist", t.location),
    index("stays_id_index").on(t.id),
    index("stays_hostid_index").on(t.hostId),
  ]
);

export const createStaySchema = createInsertSchema(stays).omit({
  hostId: true,
});
export const updateStaySchema = createUpdateSchema(stays)
  .omit({
    hostId: true,
    rating: true,
  })
  .required({
    id: true,
  });
