import { Context } from "hono";
import { signInSchema, signUpSchema } from "../utils/zodSchemas";
import { responseHandler } from "../utils/response";
import { createClient } from "../db/database";
import { sign } from "hono/jwt";
import { setCookie } from "hono/cookie";
import { hashPassword, verifyPassword } from "../utils/hast"

export const signUp = async (c: Context) => {
  try {

    const body = await c.req.json();
    const userData = signUpSchema.safeParse(body);

    const { DATABASE_URL, JWT_SECRET } = c.env;
    if (!DATABASE_URL || !JWT_SECRET) {
      return c.json( responseHandler("error", "Server configuration error"), 500 );
    };

    if (!userData.success) {
      return c.json(responseHandler("error", "Invalid input"), 400);
    };

    const db = createClient(DATABASE_URL);
    const { name, email, password } = userData.data;

    const isExists = await db.user.findFirst({
      where: {
        email: email,
      },
    });

    if (isExists) {
      return c.json( responseHandler("error", "User already exists"), 409 );
    };

    const hashedPassword = await hashPassword(password);

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    if (!user) {
      return c.json( responseHandler("error", "Failed to create user"), 500 );
    };

    return c.json(responseHandler("success", "User created successfully"), 200);

  } catch (error) {
    return c.json( responseHandler("error", "Failed to register user", 
        {
           error: error instanceof Error ? error.message : "Internal server error",
        }),
      500
    );
  }
};

export const signIn = async(c: Context) => {
    try {

        const body = await c.req.json(); 
        const userData = signInSchema.safeParse(body);

        const { DATABASE_URL, JWT_SECRET } = c.env;
        if (!DATABASE_URL || !JWT_SECRET) {
          return c.json( responseHandler("error", "Server configuration error"), 500 );
        };

        const db = createClient(DATABASE_URL); 

        if (!userData.success){
            return c.json(responseHandler('error', "Invalid user input"), 409); 
        }; 

        const { email, password } = userData.data; 
        const user = await db.user.findFirst({
            where:{
                email: email
            }
        }); 

        if(!user){
            return c.json(responseHandler('error', 'User does not exists'), 404); 
        }

        const isPasswordCorrect = await verifyPassword(password, user?.password); 

        if(!isPasswordCorrect){
            return c.json(responseHandler('error', 'Password is incorrect'), 401); 
        }; 

        const oneMonthInSeconds : number = 30 * 24 * 60 * 60;
        const currentTime : number = Math.floor(Date.now() / 1000);
        const tokenExp : number =  currentTime + oneMonthInSeconds; 

        const token = await sign({ email: user.email, id: user.id, exp: tokenExp }, JWT_SECRET); 
        if(!token){
            c.json(responseHandler('error', 'Failed to create token'), 500);
        }; 

        setCookie(c, "token", token, {
            secure: true, 
            httpOnly: true, 
            sameSite: 'None',
            path: "/",
            maxAge:  60 * 60 * 24 * 7,
        }); 

        return c.json(responseHandler('success', 'User logged in successfully'), 200); 

    } catch (error) {
        return c.json(responseHandler('error', 'Failed to sing-in', {
            error: error instanceof Error ? error.message : "Internal server error",
        }), 500   
    )
    }
}

export const checkAuth = async(c: Context) => {
    try {

        const user = await c.get('user'); 
        return c.json(responseHandler('success', "Authorized User", user), 200); 

    } catch (error) {
        return c.json(responseHandler('error', 'Failed to check auth status', {
            error: error instanceof Error ? error.message : 'Internal server error'
        }))
    }
}
