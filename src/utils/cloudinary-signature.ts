export const generateSignature = async (params: Record<string, any>, apiSecret: string): Promise<string> => {
  const keys = Object.keys(params).sort();
  const signatureString = keys
    .filter(key => params[key] !== undefined && params[key] !== null && key !== 'file')
    .map(key => `${key}=${params[key]}`)
    .join('&');
    
  const msgUint8 = new TextEncoder().encode(signatureString + apiSecret);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8);
    
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};