import { Hono } from "hono";
import { signIn, signUp } from "../controllers/authControllers";

const authRouter = new Hono();

authRouter
    .post("/sign-up", signUp)    
    .post("/sign-in", signIn)  

export default authRouter;