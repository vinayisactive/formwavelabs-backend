const encode = (data: Uint8Array): string => btoa(String.fromCharCode(...data));
const decode = (base64: string): Uint8Array => Uint8Array.from(atob(base64), c => c.charCodeAt(0));

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt: Uint8Array = crypto.getRandomValues(new Uint8Array(16));
  
  const keyMaterial: CryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const hash: ArrayBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  return `${encode(salt)}:${encode(new Uint8Array(hash))}`;
}


export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [storedSalt, storedHashValue] = storedHash.split(':');
  
  const salt: Uint8Array = decode(storedSalt);
  
  const keyMaterial: CryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const hash: ArrayBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  const hashString: string = encode(new Uint8Array(hash));
  return hashString === storedHashValue;
}