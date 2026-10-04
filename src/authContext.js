import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { expireSession, isSessionExpired, sessionExpiresAt, subscribeToSessionExpiry } from "./session";

const AuthContext = createContext();
const readSession = () => {
  const token = localStorage.getItem("token");
  try {
    return { token, user: token ? JSON.parse(localStorage.getItem("user") || "null") : null };
  } catch { return { token, user: null }; }
};

export const AuthProvider = ({ children }) => {
  const [authDialog, setAuthDialog] = useState(null);
  const [authState, setAuthState] = useState(readSession);
  const openAuth = useCallback((mode = "login", reason = "") => {
    setAuthDialog(current => ({ mode, reason, sessionExpired: Boolean(current?.sessionExpired) }));
  }, []);
  const closeAuth = useCallback(() => setAuthDialog(null), []);
  const isAuthenticated = Boolean(authState.token && authState.user && !isSessionExpired(authState.token));

  useEffect(() => {
    const unsubscribe = subscribeToSessionExpiry(() => {
      setAuthState({ token: null, user: null });
      setAuthDialog({ mode: "login", reason: "", sessionExpired: true });
    });
    const syncSession = event => {
      if (event && event.key !== null && !["token", "user"].includes(event.key)) return;
      const session = readSession();
      if (session.token && isSessionExpired(session.token)) expireSession(session.token);
      else {
        setAuthState(session);
        if (session.token && session.user) {
          setAuthDialog(current => current?.sessionExpired ? null : current);
        }
      }
    };
    syncSession();
    window.addEventListener("storage", syncSession);
    return () => { unsubscribe(); window.removeEventListener("storage", syncSession); };
  }, []);

  useEffect(() => {
    const token = authState.token;
    if (!token) return;
    let timer;
    const checkExpiry = () => {
      clearTimeout(timer);
      if (localStorage.getItem("token") !== token) return;
      const expiry = sessionExpiresAt(token);
      if (expiry === null) return;
      const remaining = expiry - Date.now();
      if (remaining <= 0) expireSession(token);
      else timer = setTimeout(checkExpiry, Math.min(remaining, 2147483647));
    };
    checkExpiry();
    window.addEventListener("focus", checkExpiry);
    document.addEventListener("visibilitychange", checkExpiry);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", checkExpiry);
      document.removeEventListener("visibilitychange", checkExpiry);
    };
  }, [authState.token]);

  const requireAuth = (action = "continue") => {
    const token = localStorage.getItem("token");
    if (token && isSessionExpired(token)) {
      expireSession(token);
      return false;
    }
    if (isAuthenticated && token === authState.token) return true;
    openAuth("login", action);
    return false;
  };

  const login = (user) => {
    const token = localStorage.getItem("token");
    localStorage.setItem("user", JSON.stringify(user));
    setAuthState({ token, user });
  };
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("activePage");
    setAuthState({ token: null, user: null });
    closeAuth();
  };
  const updateUser = (user) => {
    if (!localStorage.getItem("token")) return;
    localStorage.setItem("user", JSON.stringify(user));
    setAuthState(current => ({ ...current, user }));
  };

  return <AuthContext.Provider value={{ user: authState.user, isAuthenticated, authDialog, openAuth, closeAuth, requireAuth, login, logout, updateUser }}>{children}</AuthContext.Provider>;
};
export const useAuth = () => useContext(AuthContext);
