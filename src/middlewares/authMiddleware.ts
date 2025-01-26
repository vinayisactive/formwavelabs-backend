import { Context, Next } from "hono";
import { responseHandler } from "../utils/response";
import { verify } from "hono/jwt";
import { createClient } from "../db/database";

export const authMiddleware = async (c: Context, next: Next) => {
  try {

    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json(
        responseHandler("error", "Authorization header missing or invalid", { isAuth: false }),
        401
      );
    }

    const token = authHeader.split(' ')[1];

    const { DATABASE_URL, JWT_SECRET } = c.env;
    if (!DATABASE_URL || !JWT_SECRET) {
      return c.json(responseHandler("error", "Server configuration error"), 500);
    }

    const db = createClient(DATABASE_URL);

    const decodedToken = await verify(token, JWT_SECRET);
    const currentTime: number = Math.floor(Date.now() / 1000);

    if (decodedToken.exp && decodedToken.exp < currentTime) {
      return c.json(responseHandler("error", "Token has expired", {isAuth: false}));
    }

    if (!decodedToken.id) {
      return c.json(responseHandler("error", "UserId is missng", {isAuth: false}), 409);
    }

    const user = await db.user.findFirst({
      where: {
        id: decodedToken.id,
      }
    });

    if (!user) {
      return c.json(responseHandler("error", "User does not exists", {isAuth: false}), 404);
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
        isAuth: false
      }),
      401
    );
  }
};
