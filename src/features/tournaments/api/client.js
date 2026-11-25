import { apiFetch } from "../../../api/client";

export async function tournamentRequest(path, options = {}) {
  const response = await apiFetch(path, options);
  let data;
  try { data = await response.json(); }
  catch { throw new Error("Unexpected server response. The request outcome may be unknown."); }
  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}
