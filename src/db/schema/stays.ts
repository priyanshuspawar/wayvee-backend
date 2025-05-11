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
    isPublished: boolean("is_published").notNull().default(false),
    hostId: uuid("host_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }),
    description: varchar("description", { length: 500 }),
    location: geometry("location", {
      type: "point",
      mode: "xy",
      srid: 4326,
    }),
    displayImages: json("display_images")
      .$type<{
        id: string;
        imageUrl: string;
        type: string;
      }>()
      .array()
      .default([]),

    perks: text("perks").array().default([]),
    baseGuest: integer("base_guest").default(1),
    bedrooms: integer("bedrooms"),
    bathrooms: integer("bathrooms"),
    currentTab: integer("current_tab").default(1),
    pricePerNight: decimal("price_per_night", {
      precision: 8,
      scale: 2,
    }),
    perPersonIncrement: decimal("per_person_increment", {
      precision: 8,
      scale: 2,
    }),
    maxOccupancy: integer("max_occupancy"),
    amenities: text("amenities").array().default([]),
    availability: boolean("availability"),
    typeOfStay: varchar("type_of_stay", { length: 20 }),
    propertyAccess: varchar("property_access", { length: 20 }),

    rating: decimal("rating", { precision: 8, scale: 2 })
      .notNull()
      .default("0"),
    discount: decimal("discount", { precision: 8, scale: 2 }).default("0"),
    address: json("address").$type<{
      name: string;
      street_address: string;
      nearby_landmark: string;
      district: string;
      city: string;
      state: string;
      pincode: string;
    }>(),
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
    createdAt: true,
    updatedAt: true,
  })
  .required({
    id: true,
  });
