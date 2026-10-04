import React, { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authDialog, setAuthDialog] = useState(null);
  const openAuth = useCallback((mode = "login", reason = "") => setAuthDialog({ mode, reason }), []);
  const closeAuth = useCallback(() => setAuthDialog(null), []);
  const [authState, setAuthState] = useState(() => ({
    isAuthenticated: Boolean(localStorage.getItem("token")),
    user: (() => {
      try {
        return JSON.parse(localStorage.getItem("user") || "null");
      } catch {
        return null;
      }
    })(),
  }));
  const isAuthenticated = authState.isAuthenticated && Boolean(authState.user);
  const requireAuth = (action = "continue") => {
    if (isAuthenticated) return true;
    openAuth("login", action);
    return false;
  };

  const login = (user) => {
    localStorage.setItem("user", JSON.stringify(user));
    setAuthState({
      isAuthenticated: true,
      user,
    });
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("activePage");
    setAuthState({
      isAuthenticated: false,
      user: null,
    });
  };

  const updateUser = (user) => {
    localStorage.setItem("user", JSON.stringify(user));
    setAuthState((current) => ({ ...current, user }));
  };

  return (
    <AuthContext.Provider value={{ ...authState, isAuthenticated, authDialog, openAuth, closeAuth, requireAuth, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
