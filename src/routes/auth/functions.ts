import { type Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { z } from "zod";
import type { User } from "../../db/schema/users";
import { randomInt } from "crypto";
import { sign, verify } from "hono/jwt";
import db from "../../db";
import { createMiddleware } from "hono/factory";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
const JWT_REFRESH_SECRET = process.env.JWT_SECRET || "refreshsupersecretkey";

type Env = {
  Variables: {
    user: User;
  };
};

type SessionManager = {
  getSessionItem: (key: string) => Promise<string | undefined>;
  setsessionItem: (userId: string) => Promise<void>;
  refresh_access_token: () => Promise<string>;
  removeSessionItem: (key: string) => Promise<void>;
  destroySession: () => Promise<void>;
};

const access_token_payload_schema = z.object({
  userId: z.string(),
});

export const getAuthenticatedUser = createMiddleware<Env>(
  async (c: Context, next) => {
    try {
      const manager = sessionManager(c);
      let token = await manager.getSessionItem("token");
      if (!token) {
        token = await manager.refresh_access_token();
      }
      const jwt_payload = await verify(token, JWT_SECRET);
      const { userId } = access_token_payload_schema.parse(jwt_payload);
      const validUser = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, userId),
      });
      if (!validUser) {
        return c.json({ message: "not found" }, 404);
      }
      c.set("user", validUser);
      await next();
    } catch (error) {
      return c.json({ message: "unauthorized" }, 401);
    }
  }
);

export const sessionManager = (c: Context): SessionManager => ({
  async getSessionItem(key: string) {
    const result = getCookie(c, key);
    return result;
  },
  async refresh_access_token() {
    const refresh_token = await this.getSessionItem("refresh_token");
    if (!refresh_token) {
      throw new Error("Refresh token expired please log in again");
    }
    const { userId } = access_token_payload_schema.parse(
      await verify(refresh_token, JWT_REFRESH_SECRET)
    );

    const access_token = await sign({ userId }, JWT_SECRET);
    setCookie(c, "token", access_token, {
      maxAge: 30 * 60,
    });
    return access_token;
  },
  async setsessionItem(userId: string) {
    const access_token = await sign({ userId }, JWT_SECRET);
    const refresh_token = await sign({ userId }, JWT_REFRESH_SECRET);
    setCookie(c, "token", access_token, {
      maxAge: 30 * 60,
    });
    setCookie(c, "refresh_token", refresh_token, {
      maxAge: 12 * 60 * 60,
    });
  },
  async removeSessionItem(key: string) {
    deleteCookie(c, key);
  },
  async destroySession() {
    ["id_token", "token", "user", "refresh_token"].forEach((key) => {
      deleteCookie(c, key);
    });
  },
});

export const generateOtp = () => {
  return randomInt(100000, 999999).toString();
};
