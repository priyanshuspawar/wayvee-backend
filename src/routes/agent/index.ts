import { Hono } from "hono";
import { getAuthenticatedUser, getUser } from "../auth/functions";
import db from "../../db";
import { jwt, type JwtVariables } from "hono/jwt";

const JWT_SECRET = process.env.JWT_SECRET!;

type Variables = JwtVariables<{ userId: string }>;

const agentRoute = new Hono()
  .use(
    "*",
    jwt({
      secret: JWT_SECRET,
    }),
    getUser
  )
  .get("/", async (c) => {
    try {
      const loggedInUser = c.get("user");
      if (!loggedInUser.isAgent) {
        return c.json({ message: "You are not applied to be agent" });
      }
      const agent = await db.query.agents.findFirst({
        where: (agents, { eq }) => eq(agents.userid, loggedInUser.id),
      });
      if (!agent) {
        return c.json(
          {
            message:
              "Your agent profile does not found, try again or please contact support if you face this issue again",
          },
          404
        );
      }
      return c.json({
        message: "Agent Profile Fetched Successfully",
        data: agent,
      });
    } catch (error) {
      return c.json({ message: "Error getting agent profile" }, 500);
    }
  })
  .get("/stays", async (c) => {
    try {
      const loggedInUser = c.get("user");
      if (!loggedInUser.isAgent) {
        return c.json({ message: "You are not applied to be agent" });
      }
      const res = await db.query.stays.findMany({
        where: (stays, { eq }) => eq(stays.hostId, loggedInUser.id),
      });
      return c.json({ message: "Stays of host fetched", data: res });
    } catch (error) {
      return c.json({ message: "Error getting agent profile" }, 500);
    }
  });

export default agentRoute;
