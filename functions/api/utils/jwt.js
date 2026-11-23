// Simple JWT implementation for Cloudflare Workers
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

function toBase64Url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function fromBase64Url(str) {
  if (!/^[A-Za-z0-9_-]+$/.test(str)) throw new Error("Invalid base64url");
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Uint8Array.from(atob(str), (character) => character.charCodeAt(0));
}

export async function generateToken(payload, secret, expiresIn = 86400) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };

  const base64Header = toBase64Url(encoder.encode(JSON.stringify(header)));
  const base64Payload = toBase64Url(encoder.encode(JSON.stringify(tokenPayload)));
  const data = `${base64Header}.${base64Payload}`;

  // Create HMAC-SHA256 signature
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: { name: 'SHA-256' } },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const base64Signature = toBase64Url(new Uint8Array(signatureBuffer));

  return `${base64Header}.${base64Payload}.${base64Signature}`;
}

export async function verifyToken(token, secret) {
  try {
    if (typeof token !== "string" || token.length > 16384) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [headerB64, payloadB64, signatureB64] = parts;
    const header = JSON.parse(decoder.decode(fromBase64Url(headerB64)));
    if (!header || header.alg !== "HS256" || header.typ !== "JWT") return null;
    const data = `${headerB64}.${payloadB64}`;

    // Verify signature
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: { name: 'SHA-256' } },
      false,
      ['verify']
    );
    
    const valid = await crypto.subtle.verify(
      'HMAC', key, fromBase64Url(signatureB64), encoder.encode(data),
    );
    if (!valid) {
      return null;
    }

    const decodedPayload = JSON.parse(decoder.decode(fromBase64Url(payloadB64)));
    const now = Math.floor(Date.now() / 1000);
    if (!decodedPayload || typeof decodedPayload !== "object" || Array.isArray(decodedPayload)
        || !Number.isSafeInteger(decodedPayload.exp) || decodedPayload.exp <= now
        || (decodedPayload.nbf !== undefined
          && (!Number.isSafeInteger(decodedPayload.nbf) || decodedPayload.nbf > now))) {
      return null;
    }

    return decodedPayload;
  } catch {
    // Malformed untrusted tokens are ordinary authentication failures.
    return null;
  }
}

export function parseAuthHeader(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

export function createSuccessResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export function createErrorResponse(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
