import { Hono } from "hono";
import { authMiddleware } from "../middlewares/auth-middleware";
import { createWorkspace, getWorkspace } from "../controllers/workspace-controllers";

const workspaceRouter = new Hono(); 

workspaceRouter
.post("/", authMiddleware, createWorkspace)
.get("/:workspaceId", authMiddleware, getWorkspace);



export default workspaceRouter; 