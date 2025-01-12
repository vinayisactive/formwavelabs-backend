type ResponseStatus = 'success' | 'error';

export const responseHandler = (status: ResponseStatus, message: string, data: unknown = null) => ({
  status,
  message,
  ...(status === 'success' ? { data } : { details: data })
});