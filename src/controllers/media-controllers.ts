import { Context } from "hono";
import { withGlobalErrorHandler } from "../utils/global-error-handler";
import { handleResponse } from "../utils/response-handler";
import { v4 as uuidV4 } from "uuid";
import axios from "axios";
import { generateSignature } from "../utils/cloudinary-signature";

export const getPreSignedUrl = withGlobalErrorHandler(async (c: Context) => {
  const { fileType, id, type } = await c.req.json();

  if (fileType !== "IMAGE" && fileType !== "PDF") {
    return c.json(
      handleResponse("error", "File type must be either image or pdf."),
      400
    );
  }

  if (!type || !id) {
    return c.json({ error: "Context type and id are required" }, 400);
  }

  const fileId = uuidV4();
  const resourceType = fileType === "PDF" ? "raw" : "image";

  const publicId = fileId;

  const tags = [
    type,  
    `${type}_${id}`,    
    resourceType          
  ];

  const timestamp = Math.round(new Date().getTime() / 1000);
  const params = {
    timestamp,
    public_id: publicId,
    tags: tags.join(','),
  };

  const signature = await generateSignature(params, c.env.CLOUDINARY_API_SECRET);

  return c.json(handleResponse("success", "Pre-signed url generated.", {
    uploadUrl: `https://api.cloudinary.com/v1_1/${c.env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
    formData: {
      file: '',
      api_key: c.env.CLOUDINARY_API_KEY,
      timestamp: timestamp.toString(),
      signature,
      public_id: publicId,
      tags: tags.join(','),
    },
    fileId
  }), 200);
});

export const deleteMediaByTag = withGlobalErrorHandler(async(c: Context) => {
  const id = c.req.query("id"); 
  const type = c.req.query("type"); 

  console.log(id)
  console.log(type)

  if (!type || !id) {
    return c.json({ error: "Context type and id are required" }, 400);
  }

  const tag = `${type}_${id}`; 
  
  const url = `https://api.cloudinary.com/v1_1/${c.env.CLOUDINARY_CLOUD_NAME}/resources/image/tags/${tag}?resource_type=auto`;

  const authHeader = `Basic ${btoa(`${c.env.CLOUDINARY_API_KEY}:${c.env.CLOUDINARY_API_SECRET}`)}`;

  const { data } = await axios.delete(url, {
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    }
  });

  return c.json(handleResponse("success", "Deleted all files tagged as '${tag}.", data), 200); 
});  