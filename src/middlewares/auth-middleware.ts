import { Context, Next } from "hono";
import { handleResponse } from "../utils/response-handler";
import { verify } from "hono/jwt";
import { getDatabase } from "../db/database";

export const authMiddleware = async (c: Context, next: Next) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json(
        handleResponse("error", "Unauthorized: Missing or invalid Authorization header.", { isAuth: false }),
        401
      );
    }

    const token = authHeader.split(" ")[1];

    const { DATABASE_URL, JWT_SECRET } = c.env;
    if (!DATABASE_URL || !JWT_SECRET) {
      return c.json(
        handleResponse("error", "Server misconfiguration: Missing database or JWT secret."),
        500
      );
    }

    const db = getDatabase(DATABASE_URL);

    const decodedToken = await verify(token, JWT_SECRET);
    if (!decodedToken) {
      return c.json(
        handleResponse("error", "Invalid token: Unable to authenticate user.", { isAuth: false }),
        401
      );
    }

    const currentTime = Math.floor(Date.now() / 1000);
    if (decodedToken.exp && decodedToken.exp < currentTime) {
      return c.json(
        handleResponse("error", "Session expired: Please log in again.", { isAuth: false }),
        401
      );
    }

    if (!decodedToken.id) {
      return c.json(
        handleResponse("error", "Token error: User ID is missing.", { isAuth: false }),
        400
      );
    }

    const user = await db.user.findFirst({
      where: { id: decodedToken.id },
    });

    if (!user) {
      return c.json(
        handleResponse("error", "Account not found: This user does not exist.", { isAuth: false }),
        404
      );
    }

    c.set("user", {
      id: user.id,
      email: user.email,
    });

    await next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Authentication failed: An unexpected error occurred"
    return c.json( handleResponse("error", errorMessage, { isAuth: false }), 500);
  }
};
