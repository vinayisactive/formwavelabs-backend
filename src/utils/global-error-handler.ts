import { Context, Next } from "hono";
import { handleResponse } from "./response-handler";

export const withGlobalErrorHandler = (handler: (c: Context) => Promise<Response>) => {
  return async (c: Context): Promise<Response>=> {
    try {
      return await handler(c);
    } catch (error) {
      console.error("Global Error Handler:", error);
      const errorMessage = error instanceof Error ? error.message : "Internal server error";
      return c.json(handleResponse("error", errorMessage), 500);
    }
  };
};