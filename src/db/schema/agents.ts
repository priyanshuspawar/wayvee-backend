import {
  decimal,
  pgTable,
  uuid,
  varchar,
  boolean,
  pgEnum,
  geometry,
  index,
  text,
} from "drizzle-orm/pg-core";

import { users } from "./users";
import { createInsertSchema } from "drizzle-zod";
export const membershipEnum = pgEnum("membership", ["regular", "pro"]);

export const agents = pgTable(
  "agents",
  {
    userid: uuid()
      .notNull()
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    agencyName: varchar("agency_name", { length: 255 }).notNull(),
    about: text("about").notNull(),
    rating: decimal("rating", { precision: 8, scale: 2 }).default("0"),
    verified: boolean("verified").default(false),
    membership: membershipEnum("membership").default("regular"),
    servicesOffered: text("services_offered").array().notNull(),
    location: geometry("location", {
      type: "point",
      mode: "xy",
      srid: 4326,
    }).notNull(),
  },
  (t) => [
    index("agent_userid_index").on(t.userid),
    index("agents_spatial_index").using("gist", t.location),
  ]
);

export const applyForAgentSchema = createInsertSchema(agents).omit({
  userid: true,
  rating: true,
  verified: true,
});
