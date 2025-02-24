type ResponseStatus = 'success' | 'error';

export const handleResponse = <T, E = unknown>( status: ResponseStatus, message: string, payload?: T | E ) => {
  if (status === 'success') {
    return { status, message, data: payload ?? null };
  } else {
    return { status, message, details: payload ?? null };
  }
};