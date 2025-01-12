import { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { responseHandler } from "../utils/response";
import { verify } from "hono/jwt";
import { createClient } from "../db/database";

export const authMiddleware = async (c: Context, next: Next) => {
  try {
    const token = getCookie(c, "token");
    if (!token) {
      return c.json(responseHandler("error", "Token is missing"), 401);
    }

    const { DATABASE_URL, JWT_SECRET } = c.env;
    if (!DATABASE_URL || !JWT_SECRET) {
      return c.json(responseHandler("error", "Server configuration error"), 500);
    }

    const db = createClient(DATABASE_URL);

    const decodedToken = await verify(token, JWT_SECRET);
    const currentTime: number = Math.floor(Date.now() / 1000);

    if (decodedToken.exp && decodedToken.exp < currentTime) {
      return c.json(responseHandler("error", "Token has expired"));
    }

    if (!decodedToken.id) {
      return c.json(responseHandler("error", "UserId is missng"), 409);
    }

    const user = await db.user.findFirst({
      where: {
        id: decodedToken.id,
      }
    });

    if (!user) {
      return c.json(responseHandler("error", "User does not exists"), 404);
    }

    c.set("user", {
      id: decodedToken.id,
      email: decodedToken.email,
    });

    await next();
  } catch (error) {
    return c.json(
      responseHandler("error", "Authentication error", {
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      500
    );
  }
};
