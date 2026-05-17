const encoder = new TextEncoder();

function base64urlEncode(str) {
  return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return atob(str);
}

export async function generateToken(payload, secret, expiresIn = 86400) {
  try {
    const header = { alg: "HS256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    
    const tokenPayload = {
      ...payload,
      iat: now,
      exp: now + expiresIn,
    };

    const base64Header = base64urlEncode(JSON.stringify(header));
    const base64Payload = base64urlEncode(JSON.stringify(tokenPayload));
    
    const data = `${base64Header}.${base64Payload}`;
    
    let signature;
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signatureBuffer = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(data)
      );
      signature = base64urlEncode(String.fromCharCode(...new Uint8Array(signatureBuffer)));
    } else {
      signature = simpleHmacSha256(data, secret);
    }

    return `${base64Header}.${base64Payload}.${signature}`;
  } catch (error) {
    console.error("Error generating token:", error);
    throw error;
  }
}

function simpleHmacSha256(data, secret) {
  let h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 
                           0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  
  const key = encoder.encode(secret);
  const dataBytes = encoder.encode(data);
  
  const keySchedule = [];
  for (let i = 0; i < 64; i++) {
    keySchedule[i] = i < key.length ? key[i] : 0;
  }
  
  for (let i = key.length; i < 64; i++) {
    keySchedule[i] = 0;
  }
  
  const paddedData = new Uint8Array(((dataBytes.length + 63) >> 6) << 6);
  paddedData.set(dataBytes);
  paddedData[dataBytes.length] = 0x80;
  
  const bitLength = (dataBytes.length * 8) >>> 0;
  const bitLengthBytes = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    bitLengthBytes[i] = bitLength & 0xff;
    bitLength >>>= 8;
  }
  
  const lastBlock = paddedData.length - 64;
  for (let i = 7; i >= 0; i--) {
    paddedData[lastBlock + 56 + i] = bitLengthBytes[i];
  }
  
  for (let block = 0; block < paddedData.length; block += 64) {
    const w = new Uint32Array(64);
    for (let i = 0; i < 16; i++) {
      w[i] = (paddedData[block + i * 4] << 24) | 
             (paddedData[block + i * 4 + 1] << 16) | 
             (paddedData[block + i * 4 + 2] << 8) | 
             paddedData[block + i * 4 + 3];
    }
    
    for (let i = 16; i < 64; i++) {
      const s0 = (rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3));
      const s1 = (rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10));
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    
    let [a, b, c, d, e, f, g, hh] = h;
    
    for (let i = 0; i < 64; i++) {
      const S1 = (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + S1 + ch + k[i] + w[i]) >>> 0;
      const S0 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      
      hh = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    
    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
    h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0;
    h[7] = (h[7] + hh) >>> 0;
  }
  
  const result = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    result[i * 4] = (h[i] >> 24) & 0xff;
    result[i * 4 + 1] = (h[i] >> 16) & 0xff;
    result[i * 4 + 2] = (h[i] >> 8) & 0xff;
    result[i * 4 + 3] = h[i] & 0xff;
  }
  
  return base64urlEncode(String.fromCharCode(...result));
}

const k = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
  0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);

function rightRotate(value, bits) {
  return ((value >>> bits) | (value << (32 - bits))) >>> 0;
}

export async function verifyToken(token, secret) {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split(".");
    
    const data = `${headerB64}.${payloadB64}`;
    let expectedSignature;
    
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signatureBuffer = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(data)
      );
      expectedSignature = base64urlEncode(String.fromCharCode(...new Uint8Array(signatureBuffer)));
    } else {
      expectedSignature = simpleHmacSha256(data, secret);
    }
    
    if (expectedSignature !== signatureB64) {
      return null;
    }

    const decodedPayload = JSON.parse(base64urlDecode(payloadB64));
    
    if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return decodedPayload;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

export function parseAuthHeader(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}

export function createSuccessResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export function createErrorResponse(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}