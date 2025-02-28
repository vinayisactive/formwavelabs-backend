import { Hono } from "hono";
import { acceptInvitation, rejectInvitation, userInvitations } from "../controllers/user-controllers";
import { authMiddleware } from "../middlewares/auth-middleware";

const userRoutes = new Hono(); 
userRoutes
.use("*", authMiddleware)
.get("/invitations", userInvitations)
.post("/accept-invite", acceptInvitation)
.patch("/reject-invite", rejectInvitation)

export default userRoutes; 