import { Hono } from "hono";
import { getAuthenticatedUser } from "../auth/functions";
import db from "../../db";

const agentRoute = new Hono().get("/", getAuthenticatedUser, async (c) => {
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
});

export default agentRoute;
