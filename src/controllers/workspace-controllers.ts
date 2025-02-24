import { Context } from "hono";
import { withGlobalErrorHandler } from "../utils/global-error-handler";
import { handleResponse } from "../utils/response-handler";
import { getDatabase } from "../db/database";

export const createWorkspace = withGlobalErrorHandler(async (c: Context) => {
  const user = c.get("user");

  const { name } = await c.req.json();
  if (!name || typeof name !== "string") {
    return c.json(
      handleResponse("error", "Input error: Workspace name is required and must be a string."),
      400
    );
  }

  const { DATABASE_URL } = c.env;
  if (!DATABASE_URL) {
    return c.json(
      handleResponse("error", "Server misconfiguration: Missing database url."),
      500
    );
  }

  const db = getDatabase(DATABASE_URL); 
  
  const workspace = await db.$transaction(async(t) => {
    const createdWorkspace  = await t.workspace.create({
        data: {
            name,
            userId: user.id,
        }
      }); 
      
      await t.workspaceMember.create({
        data: {
            userId: user.id,
            workspaceId: createdWorkspace.id,
            role: "OWNER"
        }
      }); 

      return createdWorkspace; 
  })

  return c.json(
    handleResponse("success", "Application: Workspace created successfully", workspace),
    201
  )
});


export const getWorkspace = withGlobalErrorHandler(async(c: Context) => {   
    const user = c.get("user"); 
    const workspaceId = c.req.param("workspaceId"); 

    if(!workspaceId){
        return c.json(handleResponse("error", "Missing param: workspace ID required."), 400);
    }

    const { DATABASE_URL } = c.env;
    if (!DATABASE_URL) {
      return c.json(
        handleResponse("error", "Server misconfiguration: Missing database url."),
        500
      );
    }
  
    const db = getDatabase(DATABASE_URL); 

    const member = await db.workspaceMember.findFirst({
        where: {
            userId: user.id,
            workspaceId
        }
    }); 

    if (!member){
        return c.json(handleResponse("error", "Unauthorized: You are not a workspace member."), 403);
    }; 

    const workspace = await db.workspace.findFirst({
        where: {
            id: workspaceId,
        },
        select: {
            id: true,
            name: true,
            forms: {
                select: {
                    id: true,
                    title: true,
                    description: true,
                    createdAt: true
                }
            },
            members: {
                select: {
                    role: true,
                    user: {
                        select: {
                            name: true,
                            id: true
                        }
                    }
                }
            }
        }
    }); 

    return c.json(handleResponse("success", "Application: workspace data fetched.", workspace), 200); 
}); 
