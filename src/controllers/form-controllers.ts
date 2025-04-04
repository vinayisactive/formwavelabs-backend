import { Context } from "hono";
import { handleResponse } from "../utils/response-handler";
import { getDatabase } from "../db/database";
import { FormSchema } from "../utils/zod-schemas";
import { withGlobalErrorHandler } from "../utils/global-error-handler";
import axios from "axios";

//form-routes (public)
export const getForm = withGlobalErrorHandler(async (c: Context) => {
  const formId = c.req.param("formId");
  if (!formId) {
    return c.json(
      handleResponse("error", "Missing param: form ID is missing."),
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

  const form = await db.form.findFirst({
    where: {
      id: formId,
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      theme: true,
      pages: {
        select: {
          id: true,
          page: true,
          content: true,
        },
        orderBy: {
          page: "asc",
        },
      },
    },
  });

  if (!form) {
    return c.json(handleResponse("error", "Application: Form not found."), 404);
  }

  if (!form.status) {
    return c.json(
      handleResponse("error", "Application: Form is not published."),
      403
    );
  }

  return c.json(
    handleResponse("success", "Application: Form fetched.", form),
    200
  );
});

//workspace-routes (required workspaceId)
export const createForm = withGlobalErrorHandler(async (c: Context) => {
  const user = c.get("user");
  const body = await c.req.json();
  const workspaceId = c.req.param("workspaceId");

  if (!workspaceId) {
    return c.json(
      handleResponse("error", "Missing param: Workspace ID required."),
      400
    );
  }

  const formData = FormSchema.safeParse(body);
  if (!formData.success) {
    return c.json(
      handleResponse("error", "Input error: Invalid form data."),
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
  const { title, description, theme } = formData.data;

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

  if (member.role === "VIEWER") {
    return c.json(
      handleResponse(
        "error",
        "Forbidden: You do not have permission to create forms."
      ),
      403
    );
  }

  const form = await db.$transaction(async (t) => {
    const form = await t.form.create({
      data: {
        title,
        description,
        workspaceId,
        theme,
      },
    });

    await t.formPage.create({
      data: {
        page: 1,
        content: null,
        formId: form.id,
      },
    });

    return form;
  });

  return c.json(
    handleResponse("success", "Application: Form created Successfully.", form),
    201
  );
});

//workspace-routes (required workspaceId)
export const getFormWithPage = withGlobalErrorHandler(async (c: Context) => {
  const user = c.get("user");
  const pageQuery = c.req.query("p");
  const formId = c.req.param("formId");
  const workspaceId = c.req.param("workspaceId");

  if (!pageQuery) {
    return c.json(
      handleResponse(
        "error",
        "Missing query: page (?p) query parameter is required."
      ),
      400
    );
  }

  if (!formId) {
    return c.json(
      handleResponse("error", "Missing param: Form ID is missing."),
      400
    );
  }

  if (!workspaceId) {
    return c.json(
      handleResponse("error", "Missing param: Workspace ID required."),
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

  if (member?.role === "VIEWER") {
    return c.json(
      handleResponse(
        "error",
        "Forbidden: You do not have permission to get form."
      ),
      403
    );
  }

  const pageNumber = parseInt(pageQuery);
  if (isNaN(pageNumber) || pageNumber < 1) {
    return c.json(
      handleResponse(
        "error",
        "Input error: Page (?p) query must be a valid positive number."
      ),
      400
    );
  }

  const form = await db.form.findFirst({
    where: {
      id: formId,
      workspaceId,
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      theme: true,
      pages: {
        where: {
          formId: formId,
          page: pageNumber,
        },
        select: {
          id: true,
          page: true,
          content: true,
        },
      },
      workspace: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!form?.id) {
    return c.json(handleResponse("error", `Application: form not found.`), 404);
  }

  const pageCount = await db.formPage.count({
    where: {
      formId: formId,
    },
  });

  const isPageExists = form.pages.find((pg) => pg.page === pageNumber);
  if (!isPageExists) {
    return c.json(
      handleResponse(
        "error",
        `Application: Page ${pageQuery} doesn't exists for this form.`
      ),
      404
    );
  }

  return c.json(
    handleResponse("success", `Application: page ${pageQuery} fetched.`, {
      ...form,
      totalPages: pageCount,
    }),
    200
  );
});

//workspace-routes (required workspace)
export const updatePage = withGlobalErrorHandler(async (c: Context) => {
  const user = c.get("user");
  const pageQuery = c.req.query("p");
  const formId = c.req.param("formId");
  const workspaceId = c.req.param("workspaceId");
  const body = await c.req.json();
  const { pageId, content } = body;
  const contentJSON = JSON.stringify(body.content);

  if (!pageQuery) {
    return c.json(
      handleResponse(
        "error",
        "Missing query: page (?p) query parameter is required."
      ),
      400
    );
  }

  const pageNumber = parseInt(pageQuery);

  if (isNaN(pageNumber) || pageNumber < 1) {
    return c.json(
      handleResponse(
        "error",
        "Input error: Page (?p) query must be a valid positive number."
      ),
      400
    );
  }

  if (!formId) {
    return c.json(
      handleResponse("error", "Missing param: Form ID is missing."),
      400
    );
  }

  if (!workspaceId) {
    return c.json(
      handleResponse("error", "Missing param: Workspace ID required."),
      400
    );
  }

  if (!pageId) {
    return c.json(
      handleResponse(
        "error",
        "Missing field: Page ID is required in the body."
      ),
      400
    );
  }

  if (content === undefined) {
    return c.json(
      handleResponse(
        "error",
        "Missing field: Content is required in the body."
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

  const form = await db.form.findFirst({
    where: {
      id: formId,
      workspaceId,
    },
  });

  if (!form) {
    return c.json(
      handleResponse(
        "error",
        "Forbidden: Form does not belong to this workspace."
      ),
      403
    );
  }

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

  if (member.role === "VIEWER") {
    return c.json(
      handleResponse(
        "error",
        "Forbidden: You do not have permission to update this page."
      ),
      403
    );
  }

  const update = await db.formPage.update({
    where: {
      id: pageId,
      formId: formId,
      page: pageNumber,
    },
    data: {
      content: contentJSON,
    },
  });

  if (!update) {
    return c.json(
      handleResponse(
        "error",
        "Application: Failed to update page content, specified page may not exist."
      ),
      500
    );
  }

  return c.json(
    handleResponse("success", "Application: Page content updated.", update),
    200
  );
});

//workspace-routes (required workspace)
export const deleteForm = withGlobalErrorHandler(async (c: Context) => {
  const user = c.get("user");
  const workspaceId = c.req.param("workspaceId");
  const formId = c.req.param("formId");

  if (!workspaceId) {
    return c.json(
      handleResponse("error", "Missing param: Workspace ID required."),
      400
    );
  }

  if (!formId) {
    return c.json(
      handleResponse("error", "Missing param: Form ID missing."),
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

  const formCheck = await db.form.findFirst({
    where: {
      id: formId,
      workspaceId,
    },
  });

  if (!formCheck) {
    return c.json(
      handleResponse(
        "error",
        "Forbidden: Form does not belong to this workspace."
      ),
      403
    );
  }

  const member = await db.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: user.id,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!member) {
    return c.json(
      handleResponse("error", "Unauthorized: You are not a workspace member."),
      403
    );
  }

  if (member?.role === "VIEWER" || member?.role === "EDITOR") {
    return c.json(
      handleResponse(
        "error",
        "Forbidden: You do not have permission to delete this form."
      ),
      403
    );
  }

  const form = await db.form.delete({
    where: {
      id: formId,
      workspaceId,
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (!form) {
    return c.json(
      handleResponse("error", "Application: Failed to delete form."),
      500
    );
  }

  const tag = `FORM_${formId}`;
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
    handleResponse("success", "Application: Form deleted successfully.", form),
    200
  );
});

//workspace-routes (required workspace)
export const toggleFormStatus = withGlobalErrorHandler(async (c: Context) => {
  const user = c.get("user");
  const formId = c.req.param("formId");
  const workspaceId = c.req.param("workspaceId");

  if (!formId) {
    return c.json(
      handleResponse("error", "Missing param: Form ID is missing."),
      400
    );
  }

  if (!workspaceId) {
    return c.json(
      handleResponse("error", "Missing param: Workspace ID required."),
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

  const form = await db.form.findFirst({
    where: {
      id: formId,
      workspaceId,
    },
  });

  if (!form) {
    return c.json(
      handleResponse(
        "error",
        "Forbidden: Form does not belong to this workspace."
      ),
      403
    );
  }

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

  if (member.role === "VIEWER") {
    return c.json(
      handleResponse(
        "error",
        "Forbidden: You do not have permission to update this page."
      ),
      403
    );
  }

  const status = !form.status;

  const update = await db.form.update({
    where: {
      id: formId,
      workspaceId,
    },
    data: {
      status,
    },
    select: {
      id: true,
      title: true,
      status: true,
    },
  });

  if (!update) {
    return c.json(
      handleResponse("error", "Application: Failed to update form status."),
      500
    );
  }

  return c.json(
    handleResponse("success", "Application: Form status updated.", update),
    200
  );
});

//workspace-routes (required workspace)
export const getFormResponses = withGlobalErrorHandler(async (c: Context) => {
  const user = c.get("user");
  const formId = c.req.param("formId");
  const workspaceId = c.req.param("workspaceId");

  if (!formId) {
    return c.json(
      handleResponse("error", "Missing param: Form ID is missing."),
      400
    );
  }

  if (!workspaceId) {
    return c.json(
      handleResponse("error", "Missing param: Workspace ID required."),
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

  const form = await db.form.findFirst({
    where: {
      id: formId,
      workspaceId,
    },
    select: {
      id: true,
      title: true,
      description: true,
      submissions: true,
    },
  });

  if (!form) {
    return c.json(
      handleResponse(
        "error",
        "Application: The form or its submissions either do not exist or do not belong to this workspace."
      ),
      404
    );
  }

  return c.json(
    handleResponse("success", "Application: Form responses fetched.", form),
    200
  );
});

//workspace-router (required workspace)
export const createNextPage = withGlobalErrorHandler(async (c: Context) => {
  const user = c.get("user");
  const pageQuery = c.req.query("p");
  const formId = c.req.param("formId");
  const workspaceId = c.req.param("workspaceId");

  if (!pageQuery) {
    return c.json(
      handleResponse(
        "error",
        "Missing query: page (?p) query parameter is required."
      ),
      400
    );
  }

  if (!formId) {
    return c.json(
      handleResponse("error", "Missing param: Form ID is missing."),
      400
    );
  }

  if (!workspaceId) {
    return c.json(
      handleResponse("error", "Missing param: Workspace ID required."),
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

  console.log(member);

  if (!member) {
    return c.json(
      handleResponse("error", "Unauthorized: You are not a workspace member."),
      403
    );
  }

  if (member.role === "VIEWER") {
    return c.json(
      handleResponse(
        "error",
        "Forbidden: You do not have permission to create a new page."
      ),
      403
    );
  }

  const pageNumber = parseInt(pageQuery);
  if (isNaN(pageNumber) || pageNumber < 1) {
    return c.json(
      handleResponse(
        "error",
        "Input error: Page (?p) query must be a valid positive number."
      ),
      400
    );
  }

  const currentMaxPageRecord = await db.formPage.aggregate({
    where: {
      formId,
    },
    _max: {
      page: true,
    },
  });

  const currentMaxPage = currentMaxPageRecord._max.page || 0;

  if (pageNumber !== currentMaxPage) {
    return c.json(
      handleResponse(
        "error",
        `Input error: Current maximum page is ${currentMaxPage} (please check ?p=).`
      ),
      400
    );
  }

  const existingPage = await db.formPage.findFirst({
    where: {
      formId,
      page: pageNumber + 1,
    },
  });

  if (existingPage) {
    return c.json(
      handleResponse("error", "Server: Form page already exists."),
      409
    );
  }

  const page = await db.formPage.create({
    data: {
      formId,
      page: pageNumber + 1,
    },
    select: {
      id: true,
      page: true,
      formId: true,
    },
  });

  if (!page) {
    return c.json(
      handleResponse("error", "Application: Failed to create next page."),
      500
    );
  }

  return c.json(
    handleResponse("success", "Application: Next page created.", page),
    200
  );
});

//form-router (publish)
export const submitForm = withGlobalErrorHandler(async (c: Context) => {
  const formId = c.req.param("formId");
  const { content } = await c.req.json();

  if (!formId) {
    return c.json(
      handleResponse("error", "Missing param: Form ID is missing."),
      400
    );
  }

  if (!content) {
    return c.json(
      handleResponse(
        "error",
        "Invalid input: Form data is missing or invalid."
      ),
      400
    );
  }

  const contentJSON =
    typeof content === "string" ? content : JSON.stringify(content);

  const { DATABASE_URL } = c.env;
  if (!DATABASE_URL) {
    return c.json(
      handleResponse("error", "Server misconfiguration: Missing database url."),
      500
    );
  }

  const db = getDatabase(DATABASE_URL);

  const form = await db.form.findFirst({
    where: {
      id: formId,
    },
  });

  if (!form) {
    return c.json(
      handleResponse("error", "Application: Form does not exist."),
      403
    );
  }

  if (!form.status) {
    return c.json(
      handleResponse("error", "Application: Form is not published."),
      403
    );
  }

  const submission = await db.submission.create({
    data: {
      formId,
      content: contentJSON,
    },
  });

  if (!submission) {
    return c.json(
      handleResponse("error", "Application: Failed to submit form."),
      500
    );
  }

  return c.json(
    handleResponse(
      "success",
      "Application: Form response submitted.",
      submission
    ),
    201
  );
});