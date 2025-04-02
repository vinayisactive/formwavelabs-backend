import { Context } from "hono";
import { withGlobalErrorHandler } from "../utils/global-error-handler";
import { handleResponse } from "../utils/response-handler";
import { getDatabase } from "../db/database";
import ExtError from "../utils/ext-error";

export const userInvitations = withGlobalErrorHandler(async (c: Context) => {
  const user = c.get("user");

  const { DATABASE_URL } = c.env;
  if (!DATABASE_URL) {
    return c.json(
      handleResponse("error", "Server misconfiguration: Missing database url."),
      500
    );
  }

  const db = getDatabase(DATABASE_URL);

  const invitations = await db.invitation.findMany({
    where: {
      OR: [
        {
          userId: user.id,
          status: "PENDING",
        },
        {
          email: user.email,
          status: "PENDING",
        },
      ],
    },
    select: {
      id: true,
      userId: true,
      role: true,
      token: true,
      status: true,
      expiresAt: true,
      workspace: {
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
      "Application: User invitation fetched.",
      invitations
    ),
    200
  );
});

export const acceptInvitation = withGlobalErrorHandler(async (c: Context) => {
  const user = c.get("user");
  const { token } = await c.req.json();

  if (!token) {
    return c.json(
      handleResponse("error", "Invalid Input: token is missing."),
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

  const invitation = await db.invitation.findUnique({
    where: {
      token,
      expiresAt: { gt: new Date() },
      status: "PENDING",
    },
  });

  if (!invitation) {
    return c.json(
      handleResponse("error", "Server : Invitation is expired."),
      500
    );
  }

  if (invitation.userId && invitation.userId !== user.id) {
    return c.json(
      handleResponse("error", "Invitation belongs to another user"),
      403
    );
  }

  const member = await db.$transaction(async (t) => {
    const member = await t.workspaceMember.create({
      data: {
        workspaceId: invitation.workspaceId,
        userId: user.id,
        role: invitation.role,
      },
    });

    await t.invitation.update({
      where: {
        token,
      },
      data: {
        status: "ACCEPTED",
      },
    });

    return member;
  });

  return c.json(
    handleResponse("success", "Application: Joined workspace.", member),
    200
  );
});

export const rejectInvitation = withGlobalErrorHandler(async (c: Context) => {
  const user = c.get("user");
  const { token } = await c.req.json();

  if (!token) {
    return c.json(
      handleResponse("error", "Invalid Input: Token is missing."),
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

  await db.$transaction(async (t) => {
    const invitation = await t.invitation.updateMany({
      where: {
        token,
        status: "PENDING",
        expiresAt: { gt: new Date() },
        OR: [{ userId: user.id }, { email: user.email }],
      },
      data: {
        status: "REJECTED",
        expiresAt: new Date(),
      },
    });

    if (invitation.count === 0) {
      const exists = await t.invitation.findFirst({
        where: { token },
      });

      if (!exists) {
        throw new ExtError("Server: Invitation not found", 404);
      }

      if (exists.status !== "PENDING") {
        throw new ExtError("Server: Invitation already processed", 409);
      }

      if (exists.expiresAt <= new Date()) {
        throw new ExtError("Server: Invitation expired", 410);
      }

      throw new ExtError(
        "Server: Not authorized to reject this invitation",
        403
      );
    }

    return { success: true };
  });

  return c.json(
    handleResponse("success", "Application: Invitation rejected."),
    200
  );
});