import { Hono } from "hono";
import authRoutes from "./authRoutes";
import formRoutes from "./formRoutes";

const apiV1Router = new Hono(); 
apiV1Router.route("/auth", authRoutes);
apiV1Router.route('/forms', formRoutes);

export default apiV1Router; 