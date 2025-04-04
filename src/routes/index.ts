import { Hono } from "hono";
import authRoutes from "./auth-routes";
import formRoutes from "./form-routes";
import workspaceRoutes from "./workspace-routes";
import userRoutes from "./user-routes";
import { getPreSignedUrl } from "../controllers/media-controllers";
import mediaRouter from "./media-routes";

const apiV1Router = new Hono(); 
apiV1Router.route("/auth", authRoutes);
apiV1Router.route("/users", userRoutes);
apiV1Router.route("/forms", formRoutes);
apiV1Router.route("/workspaces", workspaceRoutes);
apiV1Router.route("/media", mediaRouter)

export default apiV1Router; 