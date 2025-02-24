import { Context } from "hono";
import { handleResponse } from "../utils/response-handler";
import { getDatabase } from "../db/database";
import { FormSchema } from "../utils/zod-schemas";
import { withGlobalErrorHandler } from "../utils/global-error-handler";

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
    return c.json(handleResponse("error", "Unauthorized: You are not a workspace member."), 403);
  }

  if (member.role === "VIEWER") {
    return c.json(handleResponse("error", "Forbidden: You do not have permission to create forms."), 403);
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

export const getFormWithPage = async (c: Context) => {
  try {
    const user = c.get("user");

    const p = c.req.query("p");
    if (!p) {
      return c.json(
        responseHandler("error", "page (?p) query is missing"),
        400
      );
    }

    const formId = c.req.param("formId");
    if (!formId) {
      return c.json(responseHandler("error", "formId is missing"), 400);
    }

    const { DATABASE_URL } = c.env;
    if (!DATABASE_URL) {
      return c.json(
        responseHandler("error", "Server configuration error"),
        500
      );
    }

    const db = createClient(DATABASE_URL);

    const form = await db.form.findFirst({
      where: {
        id: formId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        userId: true,
        status: true,
        theme: true,
        pages: {
          where: {
            formId: formId,
            page: parseInt(p),
          },
          select: {
            id: true,
            page: true,
            content: true,
          },
        },
      },
    });

    if (!form?.id) {
      return c.json(responseHandler("error", `form not found`), 404);
    }

    if (form.userId !== user.id) {
      return c.json(
        responseHandler("error", "Unauthorized to access this form"),
        403
      );
    }

    const pageCount = await db.formPage.count({
      where: {
        formId: formId,
      },
    });

    const isPageExists = form.pages.find((pg) => pg.page === parseInt(p));
    if (!isPageExists) {
      return c.json(
        responseHandler("error", `page ${p} doesn't exists for this form`),
        404
      );
    }

    return c.json(
      responseHandler("success", `page ${p} fetched successfully`, {
        ...form,
        totalPages: pageCount,
      }),
      200
    );
  } catch (error) {
    return c.json(
      responseHandler("error", "Failed to fetch page", {
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      500
    );
  }
};

export const getFormById = async (c: Context) => {
  try {
    const formId = c.req.param("formId");
    if (!formId) {
      return c.json(responseHandler("error", "formId is missing"), 400);
    }

    const { DATABASE_URL } = c.env;
    if (!DATABASE_URL) {
      return c.json(
        responseHandler("error", "Server configuration error"),
        500
      );
    }

    const db = createClient(DATABASE_URL);

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
      return c.json(responseHandler("error", "Form not found"), 404);
    }

    if (!form.status) {
      return c.json(responseHandler("error", "Form is not published"), 403);
    }

    return c.json(
      responseHandler("success", "Form fetched successfully", form),
      200
    );
  } catch (error) {
    return c.json(
      responseHandler("error", "Failed to fetch form", {
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      500
    );
  }
};

export const updatePage = async (c: Context) => {
  try {
    const user = c.get("user");

    const formId = c.req.param("formId");
    if (!formId) {
      return c.json(responseHandler("error", "formId is missing"), 400);
    }

    const p = c.req.query("p");
    if (!p) {
      return c.json(
        responseHandler("error", "page (?p) query is missing"),
        400
      );
    }

    const body = await c.req.json();
    if (!body.content) {
      return c.json(
        responseHandler("error", `page ${p} content is missing`),
        401
      );
    }

    const parsedContent = JSON.stringify(body.content);

    const { DATABASE_URL } = c.env;
    if (!DATABASE_URL) {
      return c.json(
        responseHandler("error", "Server configuration error"),
        500
      );
    }

    const db = createClient(DATABASE_URL);

    const form = await db.form.findFirst({
      where: {
        id: formId,
      },
    });

    if (form?.userId !== user.id) {
      return c.json(
        responseHandler("error", "Unauthorized to update this form"),
        403
      );
    }

    const update = await db.formPage.update({
      where: {
        id: body.pageId,
        formId: formId,
        page: parseInt(p),
      },
      data: {
        content: parsedContent,
      },
    });

    if (!update) {
      return c.json(responseHandler("error", "Failed to update content"), 500);
    }

    return c.json(
      responseHandler("success", "Updated page content", update),
      200
    );
  } catch (error) {
    return c.json(
      responseHandler("error", "Failed to update content", {
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      500
    );
  }
};

export const toggleFormStatus = async (c: Context) => {
  try {
    const user = c.get("user");

    const formId = c.req.param("formId");
    if (!formId) {
      return c.json(responseHandler("error", "formId is missing"), 400);
    }

    const { DATABASE_URL } = c.env;
    if (!DATABASE_URL) {
      return c.json(
        responseHandler("error", "Server configuration error"),
        500
      );
    }

    const db = createClient(DATABASE_URL);

    const form = await db.form.findFirst({
      where: {
        id: formId,
      },
    });

    if (!form) {
      return c.json(responseHandler("success", "Form does not exists"), 404);
    }

    if (form.userId !== user.id) {
      return c.json(
        responseHandler("error", "Unauthorized to update this form"),
        403
      );
    }

    const status = !form.status;

    const update = await db.form.update({
      where: {
        id: formId,
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
        responseHandler("error", "Failed to update form status"),
        500
      );
    }

    return c.json(
      responseHandler("success", "Form status updated successfully", update),
      200
    );
  } catch (error) {
    return c.json(
      responseHandler("error", "Failed to update form status", {
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      500
    );
  }
};

export const createNextPage = async (c: Context) => {
  try {
    const formId = c.req.param("formId");
    if (!formId) {
      return c.json(responseHandler("error", "formId is missing"), 400);
    }

    const p = c.req.query("p");
    if (!p) {
      return c.json(
        responseHandler("error", "page (?p) query is missing"),
        400
      );
    }

    const { DATABASE_URL } = c.env;
    if (!DATABASE_URL) {
      return c.json(
        responseHandler("error", "Server configuration error"),
        500
      );
    }

    const db = createClient(DATABASE_URL);

    const page = await db.formPage.create({
      data: {
        formId,
        page: parseInt(p) + 1,
      },
      select: {
        formId: true,
        id: true,
        page: true,
      },
    });

    if (!page) {
      return c.json(
        responseHandler("error", "Failed to create next page"),
        500
      );
    }

    return c.json(
      responseHandler("success", "Next page created successfully", page),
      200
    );
  } catch (error) {
    return c.json(responseHandler("error", "Failed to create next page"), 500);
  }
};

export const getNextPage = async (c: Context) => {
  try {
    const formId = c.req.param("formId");
    if (!formId) {
      return c.json(responseHandler("error", "formId is missing"), 400);
    }

    const p = c.req.query("p");
    if (!p) {
      return c.json(
        responseHandler("error", "page (?p) query is missing"),
        400
      );
    }

    const { DATABASE_URL } = c.env;
    if (!DATABASE_URL) {
      return c.json(
        responseHandler("error", "Server configuration error"),
        500
      );
    }

    const db = createClient(DATABASE_URL);

    const nextPage = await db.formPage.findFirst({
      where: {
        formId: formId,
        page: parseInt(p) + 1,
      },
      select: {
        id: true,
        page: true,
        formId: true,
      },
    });

    if (!nextPage) {
      return c.json(responseHandler("error", "Failed to fetch next page"), 500);
    }

    return c.json(
      responseHandler("success", "fetch next page successfully", nextPage),
      200
    );
  } catch (error) {
    return c.json(responseHandler("error", "Failed to fetch next page"), 500);
  }
};

// export const saveAndFetchNext = async (c: Context) => {
//   try {
//     const formId = c.req.param("formId");
//     if (!formId) {
//       return c.json(responseHandler("error", "formId is missing"), 400);
//     }

//     const p = c.req.query("p");
//     if (!p) {
//       return c.json(
//         responseHandler("error", "page (?p) query is missing"),
//         400
//       );
//     }

//     const body = await c.req.json();
//     if (!body.content) {
//       return c.json(
//         responseHandler("error", `page ${p} content is missing`),
//         401
//       );
//     }

//     const parsedContent = JSON.stringify(body.content);

//     const { DATABASE_URL } = c.env;
//     if (!DATABASE_URL) {
//       return c.json(
//         responseHandler("error", "Server configuration error"),
//         500
//       );
//     }

//     const db = createClient(DATABASE_URL);

//     const currentPage = await db.formPage.update({
//       where: {
//         id: body.pageId,
//         formId: formId,
//         page: parseInt(p),
//       },
//       data: {
//         content: parsedContent,
//       },
//     });

//     if (!currentPage) {
//       return c.json(
//         responseHandler("error", "Failed to update current page"),
//         500
//       );
//     }

//     const nextPage = await db.formPage.findFirst({
//       where: {
//         formId,
//         page: parseInt(p) + 1,
//       },
//       select: {
//         id: true,
//         page: true,
//         formId: true,
//       },
//     });

//     if (!nextPage) {
//       return c.json(responseHandler("error", "Failed to fetch next page"), 500);
//     }

//     return c.json(
//       responseHandler("success", "Next page fetched successfully", nextPage),
//       201
//     );
//   } catch (error) {
//     return c.json(
//       responseHandler("error", "Failed to create next page", {
//         error: error instanceof Error ? error.message : "Internal server error",
//       }),
//       500
//     );
//   }
// };

export const getUserForms = async (c: Context) => {
  try {
    const user = c.get("user");

    const { DATABASE_URL } = c.env;
    if (!DATABASE_URL) {
      return c.json(
        responseHandler("error", "Server configuration error"),
        500
      );
    }

    const db = createClient(DATABASE_URL);

    const forms = await db.form.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return c.json(responseHandler("success", "Fetched user forms", forms), 200);
  } catch (error) {
    return c.json(
      responseHandler("error", "Failed to fetch user forms", {
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      500
    );
  }
};

export const submitFormResponse = async (c: Context) => {
  try {
    const formId = c.req.param("formId");
    if (!formId) {
      return c.json(responseHandler("error", "formId is missing"), 400);
    }

    const body = await c.req.json();
    if (!body) {
      return c.json(responseHandler("error", "Content is missing"), 401);
    }

    const { DATABASE_URL } = c.env;
    if (!DATABASE_URL) {
      return c.json(
        responseHandler("error", "Server configuration error"),
        500
      );
    }

    const db = createClient(DATABASE_URL);

    const form = await db.form.findFirst({
      where: {
        id: formId,
      },
    });

    if (!form?.status) {
      return c.json(
        responseHandler("error", "Form is not currently published"),
        403
      );
    }

    const submission = await db.submission.create({
      data: {
        formId,
        content: body.content,
      },
    });

    if (!submission) {
      return c.json(responseHandler("error", "Failed to submit form"), 500);
    }

    return c.json(
      responseHandler(
        "success",
        "Form response submitted successfully",
        submission
      ),
      200
    );
  } catch (error) {
    return c.json(
      responseHandler("error", "Failed to submit form", {
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      500
    );
  }
};

export const getFormResponses = async (c: Context) => {
  try {
    const user = c.get("user");

    const formId = c.req.param("formId");
    if (!formId) {
      return c.json(responseHandler("error", "formId is missing"), 400);
    }

    const { DATABASE_URL } = c.env;
    if (!DATABASE_URL) {
      return c.json(
        responseHandler("error", "Server configuration error"),
        500
      );
    }

    const db = createClient(DATABASE_URL);

    const form = await db.form.findUnique({
      where: {
        id: formId,
      },
      include: {
        submissions: true,
      },
    });

    if (!form) {
      return c.json(responseHandler("error", "Form not found"), 404);
    }

    if (form.userId !== user.id) {
      return c.json(
        responseHandler(
          "error",
          "Unauthorized to access this form's submissions"
        ),
        403
      );
    }

    return c.json(
      responseHandler("success", "Fetched form responses successfully", {
        form: {
          id: form.id,
          title: form.title,
          description: form.description,
        },
        responses: form.submissions,
      }),
      200
    );
  } catch (error) {
    return c.json(
      responseHandler("error", "Failed to fetch form responses", {
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      500
    );
  }
};
