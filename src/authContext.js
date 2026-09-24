import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    isAuthenticated: Boolean(localStorage.getItem("token")),
    user: (() => {
      try {
        return JSON.parse(localStorage.getItem("user") || "null");
      } catch {
        return null;
      }
    })(),
  });

  const login = (user) => {
    localStorage.setItem("user", JSON.stringify(user));
    setAuthState({
      isAuthenticated: true,
      user,
    });
  };

  const logout = () => {
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
    <AuthContext.Provider value={{ ...authState, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
