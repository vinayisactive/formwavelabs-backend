import { Hono } from "hono";
import { authMiddleware } from "../middlewares/auth-middleware";
import {
  createWorkspace,
  deleteWorkspace,
  getMemberRole,
  getWorkspace,
  getWorkspaces,
  inviteMember,
  leaveWorkspace,
  removeMember,
  updateWorkspace,
} from "../controllers/workspace-controllers";
import {
  createForm,
  createNextPage,
  deleteForm,
  getFormResponses,
  getFormWithPage,
  toggleFormStatus,
  updatePage,
} from "../controllers/form-controllers";

const workspaceRoutes = new Hono();
const formSubRoutes = new Hono();

workspaceRoutes
  .use("*", authMiddleware)
  .post("/", createWorkspace)
  .get("/", getWorkspaces)
  .get("/:workspaceId", getWorkspace)
  .patch("/:workspaceId", updateWorkspace)
  .delete("/:workspaceId", deleteWorkspace)

  .get("/:workspaceId/member/role", getMemberRole)
  .post("/:workspaceId/invite", inviteMember)
  .delete("/:workspaceId/leave", leaveWorkspace)
  .delete("/:workspaceId/remove/:userId", removeMember)

formSubRoutes
  .post("/", createForm)
  .delete("/:formId", deleteForm)
  .patch("/:formId/status", toggleFormStatus)
  .get("/:formId/responses", getFormResponses)
  .get("/:formId/pages", getFormWithPage)
  .patch("/:formId/pages", updatePage)
  .post("/:formId/pages/next", createNextPage);

workspaceRoutes.route("/:workspaceId/forms", formSubRoutes);

export default workspaceRoutes;
