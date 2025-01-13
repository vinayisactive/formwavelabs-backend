import { Hono } from "hono";
import {
  createForm,
  createFormNextPage,
  getFormById,
  getFormWithPage,
  submitFormResponse,
  toggleFormStatus,
  updateFormPage,
} from "../controllers/formControllers";
import { authMiddleware } from "../middlewares/authMiddleware";

const formRoutes = new Hono();

formRoutes
    .post("/", authMiddleware, createForm)                 
    .get("/:formId", getFormById);   

formRoutes 
    .get("/:formId/with-page", getFormWithPage) 
    .post("/:formId/page", createFormNextPage)   
    .put("/:formId/page", updateFormPage);           


formRoutes
    .patch("/:formId/status", toggleFormStatus)    
    .post("/:formId/submissions", submitFormResponse); 


export default formRoutes;
