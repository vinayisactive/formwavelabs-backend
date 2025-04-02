import { Context } from "hono";
import { withGlobalErrorHandler } from "../utils/global-error-handler";
import { handleResponse } from "../utils/response-handler";
import { getDatabase } from "../db/database";

function isMobileDevice(userAgent: string): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  }

export const trackFormVisit  = withGlobalErrorHandler(async(c: Context) => {
    const formId = c.req.param("formId"); 
    const userAgent = c.req.header("User-Agent");

    if(!userAgent){
        return c.json(handleResponse("error", "Header User-Agent is missing."), 400);
    }

    const deviceType = isMobileDevice(userAgent) ? 'MOBILE' : 'DESKTOP';

    if(!formId){
        return c.json(handleResponse("error", "Form ID is missing in params."), 400); 
    }

    const { DATABASE_URL, JWT_SECRET } = c.env;
    if (!DATABASE_URL || !JWT_SECRET) {
      return c.json(
        handleResponse(
          "error",
          "Server misconfiguration: Missing database or JWT secret."
        ),
        500
      );
    }
  
    const db = getDatabase(DATABASE_URL); 

    await db.$transaction(async(t) => {
        await t.formVisit.create({
            data: {
                formId,
                deviceType
            }
        })

        await t.formAnalyticsSummary.upsert({
            where:{
                formId
            }, 
            create: {
                formId,
                totalVisits: 1,
                mobileVisits: deviceType === "MOBILE" ? 1 : 0,
                desktopVisits: deviceType === "DESKTOP" ? 1 : 0
            },
            update: {
                totalVisits: {
                    increment: 1
                },
                mobileVisits: deviceType === "MOBILE" ? {increment: 1} : undefined,
                desktopVisits: deviceType === "DESKTOP" ? {increment: 1} : undefined
            }
        })
    }); 
    
    return c.json(handleResponse("success", "Tracked a visit successfully"), 200); 
}); 

export const fetchFormAnalytics  = withGlobalErrorHandler(async(c: Context) => {
    const formId = c.req.param("formId"); 

    if(!formId){
        return c.json(handleResponse("error", "Form ID is missing in params."), 400); 
    }

    const { DATABASE_URL, JWT_SECRET } = c.env;
    if (!DATABASE_URL || !JWT_SECRET) {
      return c.json(
        handleResponse(
          "error",
          "Server misconfiguration: Missing database or JWT secret."
        ),
        500
      );
    }
  
    const db = getDatabase(DATABASE_URL); 

    const { analyticsData, submissionCount } = await db.$transaction(async (t) => {
        const analyticsData = await t.formAnalyticsSummary.findFirst({
          where: { formId },
        });
    
        const submissionCount = await t.submission.count({
          where: { formId },
        });
    
        return { analyticsData, submissionCount };
      });
    
      if (!analyticsData) {
        return c.json(handleResponse("error", "No analytics data found for the provided Form ID."), 404);
      }

     const conversionRate = analyticsData?.totalVisits > 0 ? (submissionCount / analyticsData?.totalVisits) * 100 : 0;

     return c.json(handleResponse("success", "Form analytics data fetched successfully.", {
        formId,
        totalVisits: analyticsData.totalVisits,
        totalSubmissions: submissionCount,
        conversionRate: conversionRate.toFixed(2),
        deviceBreakdown: {
          mobile: analyticsData.mobileVisits,
          desktop: analyticsData.desktopVisits
        }
    }), 200); 
});