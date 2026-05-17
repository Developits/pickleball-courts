/**
 * Input sanitization utilities for XSS protection
 */

export function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  // Remove null bytes and control characters
  let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

export function sanitizeForDisplay(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  // HTML encode special characters for safe display
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

export function validateAndSanitizeEmail(email) {
  const sanitized = sanitizeInput(email);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(sanitized) ? sanitized : null;
}

export function validateAndSanitizePhone(phone) {
  const sanitized = sanitizeInput(phone);
  // Remove all non-digit characters
  const digitsOnly = sanitized.replace(/\D/g, '');
  return digitsOnly.length >= 10 ? digitsOnly : null;
}
