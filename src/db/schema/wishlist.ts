import {
  pgTable,
  uuid,
  timestamp,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { stays } from "./stays"; // Assuming you have a stays table

export const wishlist = pgTable(
  "wishlist",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stayId: uuid("stay_id")
      .notNull()
      .references(() => stays.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.stayId] }),
    userIdx: index("wishlist_user_idx").on(table.userId),
    stayIdx: index("wishlist_stay_idx").on(table.stayId),
  })
);

import { createInsertSchema } from "drizzle-zod";
export const wishlistSchema = createInsertSchema(wishlist);
