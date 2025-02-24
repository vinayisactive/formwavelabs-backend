import { Context } from "hono";
import { SignUpInput, SignInInput } from "../utils/zod-schemas";
import { handleResponse } from "../utils/response-handler";
import { getDatabase } from "../db/database";
import { sign } from "hono/jwt";
import { hashPassword, verifyPassword } from "../utils/hast";
import { withGlobalErrorHandler } from "../utils/global-error-handler";

const TOKEN_EXPIRY = 7 * 24 * 60 * 60;

export const signUp = withGlobalErrorHandler(async (c: Context) => {
  const body = await c.req.json();
  const userData = SignUpInput.safeParse(body);

  const { DATABASE_URL, JWT_SECRET } = c.env;
  if (!DATABASE_URL || !JWT_SECRET) {
    return c.json(
      handleResponse(
        "error",
        "Server misconfiguration: Missing database or JWT secret."
      ),
      500
    );
  }

  if (!userData.success) {
    return c.json(
      handleResponse("error", "Input error: Invalid form data."),
      400
    );
  }

  const db = getDatabase(DATABASE_URL);
  const { name, email, password } = userData.data;

  const isExists = await db.user.findFirst({
    where: {
      email: email,
    },
  });

  if (isExists) {
    return c.json(
      handleResponse("error", "Signup: User already exists with this email."),
      409
    );
  }

  const hashedPassword = await hashPassword(password);

  const user = await db.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
  });

  if (!user) {
    return c.json(
      handleResponse("error", "Server error:  Failed to create user."),
      500
    );
  }

  await db.$transaction(async(t) => {
    const workspace = await db.workspace.create({
      data: {
        name: "my workspace",
        userId: user.id,
      },
    });

     await db.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        role: "OWNER",
      },
    });
  }); 

  return c.json(
    handleResponse("success", "Application: User created successfully", {
      userId: user.id,
    }),
    200
  );
});

export const signIn = withGlobalErrorHandler(async (c: Context) => {
  const body = await c.req.json();
  const userData = SignInInput.safeParse(body);

  if (!userData.success) {
    return c.json(
      handleResponse("error", "Input error: Invalid form data."),
      400
    );
  }

  const { DATABASE_URL, JWT_SECRET } = c.env;
  if (!DATABASE_URL || !JWT_SECRET) {
    return c.json(
      handleResponse(
        "error",
        "Server misconfiguration: Missing database or JWT secret."
      ),
      500
    );
  }

  const db = getDatabase(DATABASE_URL);
  const { email, password } = userData.data;

  const user = await db.user.findFirst({
    where: {
      email: email,
    },
  });

  if (!user) {
    return c.json(
      handleResponse("error", "Login failed: No account found with this email."),
      404
    );
  }

  const isPasswordCorrect = await verifyPassword(password, user.password);

  if (!isPasswordCorrect) {
    return c.json(
      handleResponse("error", "Login failed: Incorrect password. Please try again."),
      401
    );
  }

  const token = await sign(
    {
      email: user.email,
      id: user.id,
      exp: Math.floor(Date.now() / 1000) + TOKEN_EXPIRY,
    },
    JWT_SECRET
  );

  if (!token) {
    return c.json(
      handleResponse("error", "Server error: Failed to create token"),
      500
    );
  }

  return c.json(
    handleResponse("success", "Application: User logged in successfully", {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    }),
    200
  );
});