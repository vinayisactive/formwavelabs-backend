import { Context } from "hono";
import { responseHandler } from "../utils/response";
import { createClient } from "../db/database";

export const createForm = async () => {

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



