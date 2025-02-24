import { Hono } from "hono";
import authRoutes from "./auth-routes";
import formRoutes from "./form-routes";
import workspaceRouter from "./workspace-routes";

const apiV1Router = new Hono(); 
apiV1Router.route("/auth", authRoutes);
apiV1Router.route('/forms', formRoutes);
apiV1Router.route("/workspace", workspaceRouter);

export default apiV1Router; 