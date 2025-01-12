export const successResponse = (message: string, data: unknown = null) => ({
  status: "success",
  message,
  data,
});

export const errorResponse = ( message: string, details: unknown = null) => ({
  status: "error",
  message,
  details,
});
