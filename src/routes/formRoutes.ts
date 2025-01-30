import { Hono } from "hono";
import {
  createForm,
  saveAndFetchNext,
  getFormById,
  getFormResponses,
  getFormWithPage,
  getUserForms,
  submitFormResponse,
  toggleFormStatus,
  updatePage,
  createNextPage,
  getNextPage,
} from "../controllers/formControllers";
import { authMiddleware } from "../middlewares/authMiddleware";

const formRoutes = new Hono();

formRoutes
    .post("/", authMiddleware, createForm)     
    .get("/", authMiddleware, getUserForms)     
    .get("/:formId", getFormById);   

formRoutes 
    .get("/:formId/page", authMiddleware, getFormWithPage) 
    .patch("/:formId/page", authMiddleware, updatePage)   
    
formRoutes
    .post("/:formId/page/next", authMiddleware, createNextPage)
    .get("/:formId/page/next", authMiddleware, getNextPage)
    .patch("/:formId/page/next", authMiddleware, saveAndFetchNext);

formRoutes
    .patch("/:formId/status", authMiddleware, toggleFormStatus)    
    .post("/:formId/submissions", submitFormResponse)
    .get("/:formId/submissions", authMiddleware, getFormResponses);


export default formRoutes;
