import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import type { InferSelectModel } from "drizzle-orm";

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id),
    receiverId: uuid("receiver_id")
      .notNull()
      .references(() => users.id),
    content: text("content").notNull(),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    senderIndex: index("sender_id_index").on(table.senderId),
    receiverIndex: index("receiver_id_index").on(table.receiverId),
    conversationIndex: index("conversation_index").on(
      table.senderId,
      table.receiverId
    ),
  })
);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => users.id),
    lastMessageId: uuid("last_message_id").references(() => messages.id),
    userUnreadCount: integer("user_unread_count").notNull().default(0),
    agentUnreadCount: integer("agent_unread_count").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => {
    const uniqueConversation = unique("unique_conversation").on(
      table.userId,
      table.agentId
    );
    return {
      userIndex: index("conversation_user_index").on(table.userId),
      agentIndex: index("conversation_agent_index").on(table.agentId),
      // This creates a unique index
      uniqueConversation,
    };
  }
);

// Add integer import
import { integer } from "drizzle-orm/pg-core";

export const messageInsertSchema = createInsertSchema(messages).omit({
  id: true,
  read: true,
  createdAt: true,
  updatedAt: true,
});

export const messageSelectSchema = createSelectSchema(messages);

export type Message = InferSelectModel<typeof messages>;
export type Conversation = InferSelectModel<typeof conversations>;
