import { Context } from "hono";
import { withGlobalErrorHandler } from "../utils/global-error-handler";
import { handleResponse } from "../utils/response-handler";
import { getDatabase } from "../db/database";
import { v4 as uuidv4 } from "uuid";
import ExtError from "../utils/ext-error";
import axios from "axios";
import { generateSignature } from "../utils/cloudinary-signature";

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
          _count: {
            select: {
              pages: true,
              submissions: true,
            },
          },
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

export const getWorkspaceMember = withGlobalErrorHandler(async (c: Context) => {
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
    throw new ExtError(
      "Unauthorized: You are not a member of this workspace",
      403
    );
  }

  const members = await db.workspaceMember.findMany({
    where: {
      workspaceId,
    },
    select: {
      id: true,
      role: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return c.json(
    handleResponse(
      "success",
      "Application: Fetched workspace members succesfully.",
      members
    ),
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

  const tag = `WORKSPACE_${workspaceId}`;
  const url = `https://api.cloudinary.com/v1_1/${c.env.CLOUDINARY_CLOUD_NAME}/resources/image/tags/${tag}?resource_type=auto`;
  const authHeader = `Basic ${btoa(
    `${c.env.CLOUDINARY_API_KEY}:${c.env.CLOUDINARY_API_SECRET}`
  )}`;

  await axios.delete(url, {
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
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

export const addWorkspaceAsset = withGlobalErrorHandler(async (c: Context) => {
  const user = c.get("user");
  const workspaceId = c.req.param("workspaceId");
  const { assetUrl, assetPublicId } = await c.req.json();

  if (!workspaceId) {
    return c.json(
      handleResponse("error", "Missing param: workspace ID required."),
      400
    );
  }

  if (!assetUrl) {
    return c.json(
      handleResponse("error", "Invalid input: Asset URL is missing."),
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
  const MAX_ASSETS_PER_WORKSPACE = 10;

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

  if (!["OWNER", "ADMIN", "EDITOR"].includes(member.role)) {
    return c.json(
      handleResponse(
        "error",
        "Forbidden: Insufficient permissions to add assets."
      ),
      403
    );
  }

  const existingAssets = await db.workspaceAssets.findMany({
    where: { workspaceId },
    select: { id: true },
    take: MAX_ASSETS_PER_WORKSPACE,
  });

  if (existingAssets.length >= MAX_ASSETS_PER_WORKSPACE) {
    return c.json(
      handleResponse(
        "error",
        "Bad Request: Workspace already reached assets limit."
      ),
      400
    );
  }

  const asset = await db.workspaceAssets.create({
    data: {
      workspaceId,
      imageUrl: assetUrl,
      imagePublicId: assetPublicId,
    },
  });

  return c.json(
    handleResponse(
      "success",
      "Application: Workspace Asset added successfully.",
      asset
    ),
    200
  );
});

export const getWorkspaceAssets = withGlobalErrorHandler(async (c: Context) => {
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

  const assets = await db.workspaceAssets.findMany({
    where: {
      workspaceId,
    },
  });

  return c.json(
    handleResponse(
      "success",
      "Application: Fetched workspace successfully.",
      assets
    ),
    200
  );
});

export const deleteWorkspaceAsset = withGlobalErrorHandler(async (c: Context) => {
    const user = c.get("user");
    const workspaceId = c.req.param("workspaceId");
    const assetId = c.req.query("assetId");

    if (!assetId) {
      return c.json(
        handleResponse("error", "Asset ID is missing in query."),
        400
      );
    }

    if (!workspaceId) {
      return c.json(
        handleResponse("error", "Missing param: workspace ID required."),
        400
      );
    }

    const { DATABASE_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = c.env;

    if (!DATABASE_URL) {
      return c.json(
        handleResponse(
          "error",
          "Server misconfiguration: Missing database URL."
        ),
        500
      );
    }

    if ( !CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      return c.json(
        handleResponse(
          "error",
          "Server misconfiguration: Missing Cloudinary credentials."
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

    if (!["OWNER", "ADMIN", "EDITOR"].includes(member.role)) {
      return c.json(
        handleResponse(
          "error",
          "Forbidden: Insufficient permissions to delete assets."
        ),
        403
      );
    }

    const asset = await db.workspaceAssets.findUnique({
      where: {
        workspaceId,
        id: assetId,
      },
    });

    if (!asset) {
      return c.json(handleResponse("error", "Asset not found."), 404);
    }

    if (!asset.imagePublicId) {
      return c.json(
        handleResponse("error", "Asset has no associated image."),
        400
      );
    }

    const timestamp = Math.round(Date.now() / 1000);
    const params = { timestamp, public_id: asset.imagePublicId };
    const signature = await generateSignature(params, CLOUDINARY_API_SECRET);

    const formData = new URLSearchParams();
    formData.append("public_id", asset.imagePublicId);
    formData.append("timestamp", timestamp.toString());
    formData.append("api_key", CLOUDINARY_API_KEY);
    formData.append("signature", signature);

    await axios.post(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`,
      formData.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const deletedAsset = await db.workspaceAssets.delete({
      where: {
        workspaceId,
        id: assetId,
      },
    });

    return c.json(
      handleResponse("success", "Asset deleted successfully.", deletedAsset),
      200
    );
  }
);

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

  if (
    !email ||
    !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)
  ) {
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

  if (user.email === email) {
    return c.json(
      handleResponse("error", "Invalid operation: Cannot invite yourself."),
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

  const invitation = await db.$transaction(async (t) => {
    const member = await t.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: user.id,
      },
    });

    if (!member) {
      throw new ExtError(
        "Unauthorized: You are not a member of this workspace",
        403
      );
    }

    if (!["OWNER", "ADMIN"].includes(member.role)) {
      throw new ExtError(
        "Forbidden: Insufficient permissions to invite members.",
        409
      );
    }

    const existingUser = await t.user.findFirst({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (!existingUser) {
      throw new ExtError("Cannot invite: User does not exist", 400);
    }

    const isAlreadyWorkspaceMember = await t.workspaceMember.findFirst({
      where: {
        userId: existingUser.id,
        workspaceId,
      },
    });

    if (isAlreadyWorkspaceMember) {
      throw new ExtError(
        "Applicaton: User is already a member of this workspace.",
        500
      );
    }

    const existingValidInvitation = await t.invitation.findFirst({
      where: {
        email,
        workspaceId,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        expiresAt: true,
        status: true,
      },
    });

    if (existingValidInvitation) {
      throw new ExtError("Active invitation already exists for this user", 409);
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return await t.invitation.create({
      data: {
        email,
        userId: existingUser.id,
        role,
        token: uuidv4(),
        expiresAt,
        workspaceId,
      },
      select: {
        id: true,
        email: true,
        workspaceId: true,
        status: true,
      },
    });
  });

  return c.json(
    handleResponse(
      "success",
      "Application: Invitation sent successfully.",
      invitation
    ),
    200
  );
});

export const getMemberRole = withGlobalErrorHandler(async (c: Context) => {
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
        "Unauthorized: You are not a member of this workspace",
        403
      )
    );
  }

  const role = member.role;

  return c.json(
    handleResponse("success", "Application: Role fetched successfully.", {
      role,
    }),
    200
  );
});

export const leaveWorkspace = withGlobalErrorHandler(async (c: Context) => {
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
      handleResponse(
        "error",
        "Server misconfiguration: Missing database URL or RESEND key."
      ),
      500
    );
  }

  const db = getDatabase(DATABASE_URL);

  await db.$transaction(async (t) => {
    const member = await t.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: user.id,
      },
    });

    if (!member) {
      throw new ExtError(
        "Unauthorized: You are not a member of this workspace",
        403
      );
    }

    if (member.role === "OWNER") {
      throw new ExtError(
        "Cannot leave: Ownership must be transferred before leaving.",
        403
      );
    }

    await t.workspaceMember.delete({
      where: {
        id: member.id,
      },
    });
  });

  return c.json(
    handleResponse("success", "Application: Successfully left the workspace."),
    200
  );
});

export const removeMember = withGlobalErrorHandler(async (c: Context) => {
  const user = c.get("user");
  const userToRemoveId = c.req.param("userId");
  const workspaceId = c.req.param("workspaceId");

  if (!userToRemoveId) {
    return c.json(
      handleResponse("error", "Missing param: User ID of member required."),
      400
    );
  }

  if (!workspaceId) {
    return c.json(
      handleResponse("error", "Missing param: workspace ID required."),
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

  await db.$transaction(async (t) => {
    const member = await t.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: user.id,
      },
    });

    if (!member) {
      throw new ExtError(
        "Unauthorized: You are not a member of this workspace",
        403
      );
    }

    if (!["OWNER", "ADMIN"].includes(member.role)) {
      throw new ExtError(
        "Forbidden: Insufficient permissions to remove members.",
        403
      );
    }

    const memberToRemove = await t.workspaceMember.findFirst({
      where: {
        userId: userToRemoveId,
        workspaceId,
      },
    });

    if (!memberToRemove) {
      throw new ExtError("Application: User isn't a member of workspace.", 404);
    }

    if (memberToRemove.role === "OWNER") {
      throw new ExtError(
        "Application: Can't remove Owner of the workspace.",
        403
      );
    }

    await t.workspaceMember.delete({
      where: {
        id: memberToRemove.id,
      },
    });
  });

  return c.json(
    handleResponse("success", "Application: Successfully removed the member."),
    200
  );
});
