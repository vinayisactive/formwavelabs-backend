import { Context } from "hono";
import { handleResponse } from "./response-handler";
import ExtError from "./ext-error";
import { ContentfulStatusCode } from "hono/utils/http-status";

const isValidStatusCode = (code: number): code is ContentfulStatusCode => {
  return (code >= 100 && code < 600) || code === -1;
};

export const withGlobalErrorHandler = (handler: (c: Context) => Promise<Response>) => {
  return async (c: Context): Promise<Response>=> {
    try {
      return await handler(c);
    } catch (error) {
      console.error("Global Error Handler:", error);

      let statusCode; 
      let message = "Internal server error"; 

      if(error instanceof ExtError){
        statusCode = isValidStatusCode(error.statusCode) ? error.statusCode : 500;
        message = error.message
      }else if(error instanceof Error){
        message = error.message; 
      }

      return c.json(handleResponse("error", message), statusCode);
    }
  };
};