import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import z from "zod";
import { jwt, type JwtVariables } from "hono/jwt";
import { getUser } from "../auth/functions";
import db from "../../db";
import { conversations, messageInsertSchema, messages } from "../../db/schema";
import { and, eq, or, desc, sql, asc } from "drizzle-orm";
import pusher, { PusherEvents } from "../../services/pusher";

const JWT_SECRET = process.env.JWT_SECRET!;

type Variables = JwtVariables<{ userId: string }>;

const messageRoutes = new Hono<{ Variables: Variables }>()
  .use(
    "*",
    jwt({
      secret: JWT_SECRET,
    }),
    getUser
  )
  // Get all conversations for current user (whether as user or agent)
  .get("/conversations", async (c) => {
    try {
      const loggedInUser = c.get("user");

      // Get all conversations where the user is involved either as user or agent
      const userConversations = await db.query.conversations.findMany({
        where: (conversations, { eq, or, and }) => {
          // Base condition - user is either the userId or agentId
          const baseCondition = or(
            eq(conversations.userId, loggedInUser.id),
            eq(conversations.agentId, loggedInUser.id)
          );

          // If user is not an agent, we need to filter out conversations where they're the agent
          if (!loggedInUser.isAgent) {
            return and(
              baseCondition,
              eq(conversations.userId, loggedInUser.id) // Only show where they're the user
            );
          }

          // If user is an agent, show all conversations where they're either user or agent
          return baseCondition;
        },
        orderBy: (conversations, { desc }) => [desc(conversations.updatedAt)],
        with: {
          user: true,
          agent: true,
          lastMessage: true,
        },
      });

      return c.json({
        message: "Conversations fetched successfully",
        data: userConversations,
      });
    } catch (error) {
      console.error("Error fetching conversations:", error);
      return c.json({ message: "Failed to fetch conversations" }, 500);
    }
  })

  // Get conversation with specific user/agent
  .get("/conversation/:otherId", async (c) => {
    try {
      const loggedInUser = c.get("user");
      const { otherId } = c.req.param();

      if (!otherId) {
        return c.json({ message: "Other user ID is required" }, 400);
      }

      // Check if a conversation already exists
      let conversation = await db.query.conversations.findFirst({
        where: (conversations, { eq, or, and }) =>
          or(
            and(
              eq(conversations.userId, loggedInUser.id),
              eq(conversations.agentId, otherId)
            ),
            and(
              eq(conversations.userId, otherId),
              eq(conversations.agentId, loggedInUser.id)
            )
          ),
      });

      // If no conversation exists, but otherId is a valid user
      if (!conversation) {
        // Check if other user exists and is an agent (if logged in user is not an agent)
        const otherUser = await db.query.users.findFirst({
          where: (users, { eq }) => eq(users.id, otherId),
        });

        if (!otherUser) {
          return c.json({ message: "User not found" }, 404);
        }

        // Determine user and agent IDs
        let userId, agentId;
        if (loggedInUser.isAgent && !otherUser.isAgent) {
          userId = otherUser.id;
          agentId = loggedInUser.id;
        } else if (!loggedInUser.isAgent && otherUser.isAgent) {
          userId = loggedInUser.id;
          agentId = otherUser.id;
        } else {
          return c.json(
            { message: "Invalid conversation. One party must be an agent." },
            400
          );
        }

        // Create a new conversation
        const [newConversation] = await db
          .insert(conversations)
          .values({
            userId,
            agentId,
          })
          .returning();

        conversation = newConversation;
      }

      // Get messages for this conversation
      const messageList = await db.query.messages.findMany({
        where: (messages, { and, or }) =>
          and(
            or(
              and(
                eq(messages.senderId, loggedInUser.id),
                eq(messages.receiverId, otherId)
              ),
              and(
                eq(messages.senderId, otherId),
                eq(messages.receiverId, loggedInUser.id)
              )
            )
          ),
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
      });

      // Mark unread messages as read
      const isUserInConversation = conversation.userId === loggedInUser.id;

      if (isUserInConversation) {
        await db
          .update(conversations)
          .set({ userUnreadCount: 0 })
          .where(eq(conversations.id, conversation.id));
      } else {
        await db
          .update(conversations)
          .set({ agentUnreadCount: 0 })
          .where(eq(conversations.id, conversation.id));
      }

      // Mark messages as read
      await db
        .update(messages)
        .set({ read: true })
        .where(
          and(
            eq(messages.receiverId, loggedInUser.id),
            or(eq(messages.senderId, otherId), eq(messages.receiverId, otherId))
          )
        );

      // Notify sender that messages were read
      pusher.trigger(`private-user-${otherId}`, PusherEvents.MESSAGE_READ, {
        conversationId: conversation.id,
        readBy: loggedInUser.id,
      });

      return c.json({
        message: "Conversation fetched successfully",
        data: {
          conversation,
          messages: messageList,
        },
      });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      return c.json({ message: "Failed to fetch conversation" }, 500);
    }
  })

  // Send a message
  .post("/", zValidator("json", messageInsertSchema), async (c) => {
    try {
      const loggedInUser = c.get("user");
      const { content, receiverId } = c.req.valid("json");

      // Check if the receiver exists
      const receiver = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, receiverId),
      });

      if (!receiver) {
        return c.json({ message: "Receiver not found" }, 404);
      }

      // Determine who is user and who is agent
      let userId, agentId;
      const isReceiverAgent = receiver.isAgent;
      const isLoggedInUserAgent = loggedInUser.isAgent;

      if (isLoggedInUserAgent && !isReceiverAgent) {
        userId = receiverId;
        agentId = loggedInUser.id;
      } else if (!isLoggedInUserAgent && isReceiverAgent) {
        userId = loggedInUser.id;
        agentId = receiverId;
      } else if (isLoggedInUserAgent && isReceiverAgent) {
        // When both are agents, determine by checking if a conversation already exists
        const existingConvo = await db.query.conversations.findFirst({
          where: (conversations, { or, and }) =>
            or(
              and(
                eq(conversations.userId, loggedInUser.id),
                eq(conversations.agentId, receiverId)
              ),
              and(
                eq(conversations.userId, receiverId),
                eq(conversations.agentId, loggedInUser.id)
              )
            ),
        });

        if (existingConvo) {
          userId = existingConvo.userId;
          agentId = existingConvo.agentId;
        } else {
          // If no existing conversation, set the sender as user and receiver as agent
          userId = loggedInUser.id;
          agentId = receiverId;
        }
      } else {
        return c.json(
          { message: "Invalid conversation. One party must be an agent." },
          400
        );
      }

      // Insert the new message
      const [newMessage] = await db
        .insert(messages)
        .values({
          senderId: loggedInUser.id,
          receiverId,
          content,
        })
        .returning();

      // Find or create conversation
      let conversation = await db.query.conversations.findFirst({
        where: (conversations, { eq, and }) =>
          and(
            eq(conversations.userId, userId),
            eq(conversations.agentId, agentId)
          ),
      });

      if (!conversation) {
        // Create new conversation
        const [newConversation] = await db
          .insert(conversations)
          .values({
            userId,
            agentId,
            lastMessageId: newMessage.id,
            userUnreadCount: userId === receiverId ? 1 : 0,
            agentUnreadCount: agentId === receiverId ? 1 : 0,
          })
          .returning();

        conversation = newConversation;
      } else {
        // Update existing conversation
        await db
          .update(conversations)
          .set({
            lastMessageId: newMessage.id,
            updatedAt: new Date(),
            userUnreadCount:
              userId === receiverId
                ? sql`${conversations.userUnreadCount} + 1`
                : conversations.userUnreadCount,
            agentUnreadCount:
              agentId === receiverId
                ? sql`${conversations.agentUnreadCount} + 1`
                : conversations.agentUnreadCount,
          })
          .where(eq(conversations.id, conversation.id));
      }

      // Send real-time notification via Pusher
      pusher.trigger(`private-user-${receiverId}`, PusherEvents.NEW_MESSAGE, {
        message: newMessage,
        conversationId: conversation.id,
        sender: {
          id: loggedInUser.id,
          name: `${loggedInUser.firstname} ${loggedInUser.lastname}`,
          picture: loggedInUser.picture,
        },
      });

      return c.json({
        message: "Message sent successfully",
        data: newMessage,
      });
    } catch (error) {
      console.error("Error sending message:", error);
      return c.json({ message: "Failed to send message" }, 500);
    }
  })

  // Mark messages as read
  .post(
    "/read",
    zValidator(
      "json",
      z.object({
        conversationId: z.string().uuid(),
      })
    ),
    async (c) => {
      try {
        const loggedInUser = c.get("user");
        const { conversationId } = c.req.valid("json");

        // Get the conversation
        const conversation = await db.query.conversations.findFirst({
          where: (conversations, { eq }) =>
            eq(conversations.id, conversationId),
        });

        if (!conversation) {
          return c.json({ message: "Conversation not found" }, 404);
        }

        // Make sure user is part of this conversation
        if (
          conversation.userId !== loggedInUser.id &&
          conversation.agentId !== loggedInUser.id
        ) {
          return c.json(
            { message: "Not authorized to access this conversation" },
            403
          );
        }

        // Determine the other user's ID
        const otherId =
          conversation.userId === loggedInUser.id
            ? conversation.agentId
            : conversation.userId;

        // Mark messages as read
        await db
          .update(messages)
          .set({ read: true })
          .where(
            and(
              eq(messages.receiverId, loggedInUser.id),
              eq(messages.senderId, otherId)
            )
          );

        // Update unread count
        const isUserInConversation = conversation.userId === loggedInUser.id;

        await db
          .update(conversations)
          .set(
            isUserInConversation
              ? { userUnreadCount: 0 }
              : { agentUnreadCount: 0 }
          )
          .where(eq(conversations.id, conversationId));

        // Notify sender that messages were read
        pusher.trigger(`private-user-${otherId}`, PusherEvents.MESSAGE_READ, {
          conversationId,
          readBy: loggedInUser.id,
        });

        return c.json({
          message: "Messages marked as read",
        });
      } catch (error) {
        console.error("Error marking messages as read:", error);
        return c.json({ message: "Failed to mark messages as read" }, 500);
      }
    }
  )

  // Send typing indicator
  .post(
    "/typing",
    zValidator(
      "json",
      z.object({
        receiverId: z.string().uuid(),
        isTyping: z.boolean(),
      })
    ),
    async (c) => {
      try {
        const loggedInUser = c.get("user");
        const { receiverId, isTyping } = c.req.valid("json");

        // Notify receiver about typing status
        pusher.trigger(`private-user-${receiverId}`, PusherEvents.TYPING, {
          userId: loggedInUser.id,
          isTyping,
        });

        return c.json({
          message: "Typing indicator sent",
        });
      } catch (error) {
        console.error("Error sending typing indicator:", error);
        return c.json({ message: "Failed to send typing indicator" }, 500);
      }
    }
  );

export default messageRoutes;
