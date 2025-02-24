import { z } from "zod";

export const SignUpInput = z.object({
    name: z.string().min(1, "Name is required."),
    email: z.string().email("Invalid email format."),
    password: z.string().min(6, "Password must be at least 6 characters."),
});

export const SignInInput = z.object({
    email: z.string().email("Invalid email format."),
    password: z.string().min(6, "Password must be at least 6 characters."),
});

export const FormSchema = z.object({
    title: z.string().min(1, "Title is required."),
    description: z.string().optional(),
    theme: z.enum(["BOXY", "ROUNDED"]),
});
