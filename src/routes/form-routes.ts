import { Hono } from "hono";
import { getForm, submitForm } from "../controllers/form-controllers";
import { fetchFormAnalytics, trackFormVisit } from "../controllers/analytics-controllers";

const formRoutes = new Hono();

formRoutes
    .get("/:formId", getForm)
    .post("/:formId/responses", submitForm)
    .post("/:formId/track", trackFormVisit)
    .get("/:formId/track", fetchFormAnalytics)

export default formRoutes;
