import axios from "axios";

type DeleteCloudinaryResource = {
    id: string; 
    type: "FORM" | "WORKSPACE"; 
    resourceType : "image" | "raw",
    cloudName: string; 
    apiSecret: string; 
    apiKey: string; 
  }
  
  export const deleteCloudinaryResource = async({id, type, resourceType, cloudName, apiSecret, apiKey} : DeleteCloudinaryResource) => {
    const tag = `${type}_${id}`;
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/${resourceType}/tags/${tag}?resource_type=${resourceType}`;
    
    const authHeader = `Basic ${btoa(
      `${apiKey}:${apiSecret}`
    )}`;
  
    try {
      const response = await axios.delete(url, {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      });
  
      return response.data;
    } catch (error) {
      console.error(`Failed to delete ${resourceType} resources:`, error);
    }
  }