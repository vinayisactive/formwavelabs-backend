import { Hono } from "hono";
import {
  createForm,
  createFormNextPage,
  getFormById,
  getFormResponses,
  getFormWithPage,
  getUserForms,
  submitFormResponse,
  toggleFormStatus,
  updateFormPage,
} from "../controllers/formControllers";
import { authMiddleware } from "../middlewares/authMiddleware";

const formRoutes = new Hono();

formRoutes
    .post("/", authMiddleware, createForm)     
    .get("/", authMiddleware, getUserForms)     
    .get("/:formId", getFormById);   

formRoutes 
    .get("/:formId/with-page", authMiddleware, getFormWithPage) 
    .post("/:formId/page", authMiddleware, createFormNextPage)   
    .put("/:formId/page", authMiddleware, updateFormPage);           

formRoutes
    .patch("/:formId/status", authMiddleware, toggleFormStatus)    
    .post("/:formId/submissions", submitFormResponse)
    .get("/:formId/submissions", authMiddleware, getFormResponses);


export default formRoutes;
