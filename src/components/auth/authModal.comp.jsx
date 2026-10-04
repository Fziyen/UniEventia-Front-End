import React, { useEffect, useState } from "react";
import { Modal } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { useAuth } from "../../authContext";
import Login from "./login.comp";
import Signup from "./signup.comp";
import "../../Styles/Auth.styles.css";

export default function AuthModal() {
  const { authDialog, openAuth, closeAuth, isAuthenticated } = useAuth();
  const [busy, setBusy] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthPath = ["/login", "/register"].includes(location.pathname);

  // Keep old bookmarks working, with the landing page behind the dialog.
  useEffect(() => {
    if (!isAuthPath) return;
    if (isAuthenticated) {
      closeAuth();
      navigate("/Dashboard", { replace: true });
    } else {
      openAuth(location.pathname === "/register" ? "register" : "login");
    }
  }, [isAuthPath, location.pathname, isAuthenticated, openAuth, closeAuth, navigate]);

  const dismiss = () => {
    if (busy) return;
    closeAuth();
    if (isAuthPath) navigate("/", { replace: true });
  };
  const complete = () => {
    closeAuth();
    if (isAuthPath || location.pathname === "/") navigate("/Dashboard", { replace: true });
  };
  const switchMode = (mode) => {
    if (!busy) openAuth(mode, authDialog?.reason);
  };

  return (
    <Modal
      open={Boolean(authDialog)}
      onCancel={dismiss}
      footer={null}
      centered
      width={460}
      className="auth-modal"
      title={<span className="auth-modal-brand"><CalendarDays size={19} /><span><strong>Uni</strong>Eventia</span></span>}
      zIndex={1400}
      maskClosable={false}
      keyboard={!busy}
      closable={!busy}
      destroyOnClose
    >
      {authDialog && <>
        {authDialog.sessionExpired && <p className="auth-reason" role="alert">Your session has expired or is no longer valid. Please log in again to continue.</p>}
        {!authDialog.sessionExpired && authDialog.reason && <p className="auth-reason">Log in or create an account to {authDialog.reason}.</p>}
        {authDialog.mode === "register" ? (
          <Signup onSuccess={complete} onSwitch={() => switchMode("login")} busy={busy} setBusy={setBusy} />
        ) : (
          <Login onSuccess={complete} onSwitch={() => switchMode("register")} busy={busy} setBusy={setBusy} />
        )}
        <button className="auth-dismiss" onClick={dismiss} disabled={busy}>Keep exploring</button>
      </>}
    </Modal>
  );
}
