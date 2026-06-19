import DOMPurify from "dompurify";

/**
 * Input sanitization utilities for XSS protection.
 *
 * NOTE: In React JSX, {value} expressions are already XSS-safe (React escapes them).
 * Use sanitizeForDisplay() ONLY when you need dangerouslySetInnerHTML.
 */

/**
 * Strips null bytes and ASCII control characters, then trims whitespace.
 * Safe to use on user input before sending to the server.
 */
export function sanitizeInput(input) {
  if (typeof input !== "string") return input;
  return Array.from(input)
    .filter((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint >= 32 && codePoint !== 127;
    })
    .join("")
    .trim();
}

/**
 * Sanitizes a string for safe insertion as HTML (dangerouslySetInnerHTML).
 * Uses DOMPurify (already installed) instead of a manual DOM node approach,
 * which would crash in non-browser environments (e.g., SSR, Cloudflare Workers).
 */
export function sanitizeForDisplay(input) {
  if (typeof input !== "string") return input;
  return DOMPurify.sanitize(input);
}

export function validateAndSanitizeEmail(email) {
  const sanitized = sanitizeInput(email);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(sanitized) ? sanitized : null;
}

export function validateAndSanitizePhone(phone) {
  const sanitized = sanitizeInput(phone);
  const digitsOnly = sanitized.replace(/\D/g, "");
  return digitsOnly.length >= 10 ? digitsOnly : null;
}
