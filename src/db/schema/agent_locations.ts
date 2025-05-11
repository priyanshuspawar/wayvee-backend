import { pgTable, uuid, geometry, varchar, index } from "drizzle-orm/pg-core";
import { agents } from "./agents";

export const agentLocations = pgTable(
  "agent_locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.userid, { onDelete: "cascade" }),

    location: geometry("location", {
      type: "point",
      mode: "xy",
      srid: 4326,
    }).notNull(),

    label: varchar("label", { length: 255 }), // optional label like "HQ", "Branch", etc.
  },
  (t) => [
    index("agent_id_index").on(t.agentId),
    index("agent_locations_spatial_index").using("gist", t.location),
  ]
);
