import { Context } from "hono";
import { withGlobalErrorHandler } from "../utils/global-error-handler";
import { handleResponse } from "../utils/response-handler";
import { getDatabase } from "../db/database";

export const createWorkspace = withGlobalErrorHandler(async (c: Context) => {
  const user = c.get("user");

  const { name } = await c.req.json();
  if (!name || typeof name !== "string") {
    return c.json(
      handleResponse(
        "error",
        "Input error: Workspace name is required and must be a string."
      ),
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

  const workspace = await db.$transaction(async (t) => {
    const createdWorkspace = await t.workspace.create({
      data: {
        name,
        userId: user.id,
      },
    });

    await t.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId: createdWorkspace.id,
        role: "OWNER",
      },
    });

    return createdWorkspace;
  });

  return c.json(
    handleResponse(
      "success",
      "Application: Workspace created successfully",
      workspace
    ),
    201
  );
});

export const getWorkspace = withGlobalErrorHandler(async (c: Context) => {
  const user = c.get("user");
  const workspaceId = c.req.param("workspaceId");

  if (!workspaceId) {
    return c.json(
      handleResponse("error", "Missing param: workspace ID required."),
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

  const member = await db.workspaceMember.findFirst({
    where: {
      userId: user.id,
      workspaceId,
    },
  });

  if (!member) {
    return c.json(
      handleResponse("error", "Unauthorized: You are not a workspace member."),
      403
    );
  }

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
          status: true,
          description: true,
          createdAt: true,
        },
      },
      members: {
        select: {
          role: true,
          user: {
            select: {
              name: true,
              id: true,
            },
          },
        },
      },
    },
  });

  return c.json(
    handleResponse(
      "success",
      "Application: workspace data fetched.",
      workspace
    ),
    200
  );
});

export const getWorkspaces = withGlobalErrorHandler(async (c: Context) => {
  const user = c.get("user");

  const { DATABASE_URL } = c.env;
  if (!DATABASE_URL) {
    return c.json(
      handleResponse("error", "Server misconfiguration: Missing database url."),
      500
    );
  }

  const db = getDatabase(DATABASE_URL);

  const userOwnedWorkspaces = await db.workspace.findMany({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
      name: true,
    },
  });

  const workspaceMemberships = await db.workspaceMember.findMany({
    where: {
      userId: user.id,
    },
    select: {
      workspace: {
        select: {
          id: true,
          name: true,
        },
      },
      role: true,
    },
  });

  const userJoinedWorkspaces = workspaceMemberships
    .filter((membership) => membership.role !== "OWNER")
    .map((membership) => membership.workspace);

  return c.json(
    handleResponse("success", "Application: User workspaces fetched.", {
      ownedWorkspaces: userOwnedWorkspaces,
      joinedWorkspaces: userJoinedWorkspaces,
    }),
    200
  );
});

export const deleteWorkspace = withGlobalErrorHandler(async (c: Context) => {
  const user = c.get("user");
  const workspaceId = c.req.param("workspaceId");

  if (!workspaceId) {
    return c.json(
      handleResponse("error", "Missing param: workspace ID required."),
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

  const member = await db.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: user.id,
    },
  });

  if (!member) {
    return c.json(
      handleResponse("error", "Unauthorized: You are not a workspace member."),
      403
    );
  }

  if (member?.role !== "OWNER") {
    return c.json(
      handleResponse(
        "error",
        "Forbidden: You do not have permission to delete workspace."
      ),
      403
    );
  }

  const workspace = await db.workspace.delete({
    where: {
      id: workspaceId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  return c.json(
    handleResponse("success", "Application: Workspace deleted.", workspace),
    200
  );
});

export const updateWorkspace = withGlobalErrorHandler(async (c: Context) => {
  const user = c.get("user");
  const workspaceId = c.req.param("workspaceId");
  const { name } = await c.req.json();

  if (!workspaceId) {
    return c.json(
      handleResponse("error", "Missing param: workspace ID required."),
      400
    );
  }

  if (!name || typeof name !== "string") {
    return c.json(
      handleResponse(
        "error",
        "Input error: Workspace name is required and must be a string."
      ),
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

  const member = await db.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: user.id,
    },
  });

  if (!member) {
    return c.json(
      handleResponse("error", "Unauthorized: You are not a workspace member."),
      403
    );
  }

  if (member?.role !== "OWNER") {
    return c.json(
      handleResponse(
        "error",
        "Forbidden: You do not have permission to update workspace."
      ),
      403
    );
  }

  const workspace = await db.workspace.update({
    where: {
      id: workspaceId,
      userId: user.id,
    },
    data: {
      name,
    },
  });

  if (!workspace) {
    return c.json(
      handleResponse("error", "Application: Failed to update workspace name."),
      500
    );
  }

  return c.json(
    handleResponse(
      "success",
      "Application: Workspace name updated.",
      workspace
    ),
    200
  );
});
