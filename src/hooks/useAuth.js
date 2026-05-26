import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

/**
 * Hook to access the auth context.
 * Throws a clear error if used outside of AuthProvider — prevents cryptic
 * "Cannot read properties of undefined" errors deeper in the component tree.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
