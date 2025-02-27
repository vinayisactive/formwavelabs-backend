import { Context } from "hono";
import { withGlobalErrorHandler } from "../utils/global-error-handler";
import { handleResponse } from "../utils/response-handler";
import { getDatabase } from "../db/database";
import { v4 as uuidv4 } from "uuid";

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

export const inviteMember = withGlobalErrorHandler(async (c: Context) => {
  const user = c.get("user");
  const workspaceId = c.req.param("workspaceId");
  const { email, role } = await c.req.json();

  if (!workspaceId) {
    return c.json(
      handleResponse("error", "Missing param: workspace ID required."),
      400
    );
  }

  if(!email ||  !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
    return c.json(
      handleResponse("error", "Invalid input: Email is invalid or missing."),
      400
    );
  }

  if (!role) {
    return c.json(
      handleResponse("error", "Invalid input: Role is missing."),
      400
    );
  }

  const { DATABASE_URL } = c.env;
  if (!DATABASE_URL) {
    return c.json(
      handleResponse(
        "error",
        "Server misconfiguration: Missing database URL or RESEND key."
      ),
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
      handleResponse(
        "error",
        "Unauthorized: You are not a member of this workspace."
      ),
      403
    );
  }

  if (!["OWNER", "ADMIN"].includes(member.role)) {
    return c.json(
      handleResponse(
        "error",
        "Forbidden: Insufficient permissions to invite members."
      ),
      403
    );
  }

  const existingUser = await db.user.findFirst({
    where: {
      email,
    },
    select: {
      id: true,
      email: true,
    },
  });


  if (!existingUser) {
    return c.json(
      handleResponse("error", "Application: Cannot invite, user does not exist."),
      400
    );
  }

  const existingValidInvitation  = await db.invitation.findFirst({
    where: {
      email,
      workspaceId,
      expiresAt: {gt: new Date()}
    },
    select: {
      id: true,
      expiresAt: true
    },
  });

  if (existingValidInvitation) {
    return c.json(
      handleResponse(
        "error",
        "Appliation: Active invitation already exists for this user."
      ),
      409
    );
  } 

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitation = await db.invitation.create({
    data: {
      email,
      userId: existingUser.id,
      role,
      token : uuidv4(),
      expiresAt,
      workspaceId,
    },
    select: {
      id: true,
      email: true,
      workspaceId: true,
      status: true,
    }
  });

  if (!invitation) {
    return c.json(
      handleResponse("error", "Server: Failed to create invitation."),
      500
    );
  }

  return c.json(
    handleResponse(
      "success",
      "Application: Invitation sent successfully.",
      invitation
    ),
    200
  );
});
