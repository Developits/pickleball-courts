export function formatGameType(type) {
  return ({
    mens_double: "Men's doubles",
    womens_double: "Women's doubles",
    mixed_double: "Mixed doubles",
  })[type] || type || "Doubles";
}

export function parseMatchDate(value) {
  if (!value) return null;
  // SQLite CURRENT_TIMESTAMP is UTC, despite having neither "T" nor "Z".
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value)
    ? `${value.replace(" ", "T")}Z` : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatMatchDate(value) {
  return parseMatchDate(value)?.toLocaleString() || "Time unavailable";
}

export function dashboardForRole(role) {
  if (role === "admin") return { path: "/admin", label: "Manage members" };
  if (role === "supervisor") return { path: "/supervisor", label: "Manage courts" };
  return { path: "/dashboard", label: "Check in & join queue" };
}
