import { Hono } from "hono";
import { getForm, submitForm } from "../controllers/form-controllers";

const formRoutes = new Hono();

formRoutes
    .get("/:formId", getForm)
    .post("/:formId/responses", submitForm);

export default formRoutes;
