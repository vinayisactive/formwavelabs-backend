import { Hono } from "hono";
import { checkAuth, signIn, signUp } from "../controllers/authControllers";
import { authMiddleware } from "../middlewares/authMiddleware";

const authRouter = new Hono();

authRouter
    .post("/sign-up", signUp)    
    .post("/sign-in", signIn)  
    .get("/check-auth",authMiddleware, checkAuth);

export default authRouter;