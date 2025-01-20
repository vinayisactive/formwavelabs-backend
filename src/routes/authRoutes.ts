import { Hono } from "hono";
import { checkAuth, logout, signIn, signUp } from "../controllers/authControllers";
import { authMiddleware } from "../middlewares/authMiddleware";

const authRouter = new Hono();

authRouter
    .post("/sign-up", signUp)    
    .post("/sign-in", signIn)  
    .get("/check-auth",authMiddleware, checkAuth)
    .post('/logout',authMiddleware, logout); 

export default authRouter;