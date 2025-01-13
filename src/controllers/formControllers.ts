import { Context } from "hono";
import { responseHandler } from "../utils/response";
import { createClient } from "../db/database";
import { createFormSchema } from "../utils/zodSchemas";

export const createForm = async (c: Context) => {
    try {
        const body = await c.req.json(); 
        const user = c.get('user');

        const formData = createFormSchema.safeParse(body);
        if (!formData.success) {
            return c.json(responseHandler("error", "Invalid input"), 400);
        };

        const { title, description } = formData.data; 

        const { DATABASE_URL } = c.env;
        if (!DATABASE_URL) {
          return c.json( responseHandler("error", "Server configuration error"), 500 );
        };

        const db = createClient(DATABASE_URL); 

        const [form, page] = await db.$transaction(async(t) => {
            const form = await t.form.create({
                data: {
                    title,
                    description,
                    userId: user.id
                }
            })

            const page = await t.formPage.create({
                data: {
                    page: 1,
                    content: null,
                    formId: form.id
                }
            })

            return [form, page]; 
        })

        if(!form){
            return c.json(responseHandler('error', 'Failed to create form'), 500); 
        }

        return c.json(responseHandler('success', 'Form created successsfully', form), 200); 
        
    } catch (error) {
        return c.json(responseHandler('error', 'Failed to create form', {
            error : error instanceof Error ? error.message : 'Internal server error'
        }), 
    500); 
    }
};

export const getFormWithPage = async () => {

};

export const getFormById = async (c: Context) => {
        try {

            const formId = c.req.param('formId');
            if(!formId){
                return c.json(responseHandler('error', 'formId is missing'), 401); 
            }

            const { DATABASE_URL } = c.env;
            if (!DATABASE_URL) {
              return c.json( responseHandler("error", "Server configuration error"), 500 );
            };
    
            const db = createClient(DATABASE_URL); 

            const form = await db.form.findFirst({
                where: {
                    id : formId,
                },
                select: {
                    id: true, 
                    title: true, 
                    description: true, 
                    status: true,
                    pages: {
                        select: {
                            id: true, 
                            page: true,
                            content: true,
                        },orderBy: {
                            page: 'asc'
                        }
                    }
                }
            }); 

            if(!form){
                return c.json(responseHandler('error', 'Form not found'), 404); 
            }
            
            if(!form.status){
                return c.json(responseHandler('error', 'Form is not published'), 403); 
            }

            return c.json(responseHandler('success', 'Form fetched successfully', form), 200); 

        } catch (error) {
            return c.json(responseHandler('error', 'Failed to fetch form', {
                error : error instanceof Error ? error.message : 'Internal server error'
            }), 
        500); 
        }
};

export const updateFormPage = async () => {

};

export const toggleFormStatus = async () => {

};

export const createFormNextPage = async () => {

};

export const submitFormResponse = async () => {

};



