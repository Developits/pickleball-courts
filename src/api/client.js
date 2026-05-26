/**
 * Shared API client with centralized auth token injection and 401 handling.
 *
 * Usage:  import { apiFetch } from "../api/client";
 *         const res = await apiFetch("/api/some-endpoint", { method: "POST", body: JSON.stringify(data) });
 *
 * On a 401 response, a custom "auth:unauthorized" event is dispatched.
 * AuthProvider listens for this event and clears the session automatically.
 */

export const AUTH_ERROR_EVENT = "auth:unauthorized";

/**
 * Drop-in replacement for fetch() that automatically:
 *  - Injects the Authorization header from localStorage
 *  - Sets Content-Type: application/json by default
 *  - Fires AUTH_ERROR_EVENT on 401 so AuthProvider can log the user out
 *
 * @param {string} url
 * @param {RequestInit} options  - Same options as fetch(); headers here override defaults
 * @returns {Promise<Response>}
 */
export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem("auth_token");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    // Allow callers to override or add extra headers
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent(AUTH_ERROR_EVENT));
  }

  return response;
}
