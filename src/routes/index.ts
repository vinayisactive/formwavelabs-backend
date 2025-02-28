import { Hono } from "hono";
import authRoutes from "./auth-routes";
import formRoutes from "./form-routes";
import workspaceRoutes from "./workspace-routes";
import userRoutes from "./user-routes";

const apiV1Router = new Hono(); 
apiV1Router.route("/auth", authRoutes);
apiV1Router.route("/users", userRoutes);
apiV1Router.route("/forms", formRoutes);
apiV1Router.route("/workspaces", workspaceRoutes);


export default apiV1Router; 