import { Hono } from "hono";
import { deleteMediaByTag, getPreSignedUrl } from "../controllers/media-controllers";

const mediaRouter = new Hono(); 
mediaRouter.post("/signed-url", getPreSignedUrl)
mediaRouter.delete("/delete", deleteMediaByTag)

export default mediaRouter; 