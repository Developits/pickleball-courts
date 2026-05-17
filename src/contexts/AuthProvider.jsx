import { useState, useEffect } from "react";
import { AuthContext } from "./AuthContext";

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("auth_token");
      const savedUser = localStorage.getItem("user");
      
      if (token && savedUser) {
        try {
          const response = await fetch("/api/auth/validate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
            localStorage.setItem("user", JSON.stringify(data.user));
          } else {
            localStorage.removeItem("auth_token");
            localStorage.removeItem("user");
          }
        } catch (error) {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("user");
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (studentId, password) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error);
    }

    localStorage.setItem("auth_token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (formData) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error);
    }

    return data;
  };

  const logout = async () => {
    const token = localStorage.getItem("auth_token");
    
    if (token) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error("Logout request failed:", error);
      }
    }
    
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const isAuthenticated = !!user;
  const isSupervisor = user?.role === "supervisor" || user?.role === "admin";
  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        isAuthenticated,
        isSupervisor,
        isAdmin,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
