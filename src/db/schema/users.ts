import { pgTable, uuid, varchar, boolean, timestamp, uniqueIndex, date } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import type { InferSelectModel } from "drizzle-orm"
import { z } from "zod";


export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    firstname: varchar("firstname", { length: 255 }).notNull(),
    lastname: varchar("lastname", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    verified: boolean("verified").notNull().default(false),
    phoneNumber: varchar("phone_number").notNull().unique(),
    countryCode: varchar("country_code", { length: 255 }).notNull(),
    governmentId: varchar("government_id", { length: 255 }),
    isAgent: boolean("is_agent").notNull().default(false),
    dateOfBirth:date("dateOfBirth").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
    userIndex: uniqueIndex("user_id_phone_number_email_index").on(table.id, table.phoneNumber, table.email)
}));


export const userInsertSchema = createInsertSchema(users);
export const userSelectSchema = createSelectSchema(users);

export type User = InferSelectModel<typeof users>;
