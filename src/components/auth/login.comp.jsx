import React, { useState } from "react";
import axios from "axios";
import { Button, Input } from "antd";
import { useAuth } from "../../authContext";
import { useRecaptcha } from "./recaptcha";
import { API_URL } from "../../api";

export default function Login({ onSuccess, onSwitch, busy, setBusy }) {
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [error, setError] = useState("");
  const { getToken, unavailable } = useRecaptcha("login");
  const { login } = useAuth();

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const recaptcha = await getToken();
      const response = await axios.post(`${API_URL}/auth/login`, { ...form, identifier: form.identifier.trim(), recaptcha });
      const { token, user } = response.data || {};
      if (!token || !user) throw new Error("Invalid authentication response. Please try again.");
      localStorage.setItem("token", token);
      login(user);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || (err.message?.includes("reCAPTCHA") ? err.message : "Could not log in. Check your details and try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-flow">
      <h2>Log in</h2>
      <form className="auth-form" onSubmit={submit}>
        <label htmlFor="login-identifier">Username or email address</label>
        <Input id="login-identifier" autoFocus autoComplete="username" required maxLength={254} value={form.identifier} disabled={busy} onChange={(e) => setForm({ ...form, identifier: e.target.value })} />
        <label htmlFor="login-password">Password</label>
        <Input.Password id="login-password" autoComplete="current-password" required maxLength={128} value={form.password} disabled={busy} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="auth-error" role="alert">{error}</p>}
        {unavailable && <p className="auth-error" role="status">reCAPTCHA is unavailable. Please refresh and try again.</p>}
        <Button type="primary" htmlType="submit" block loading={busy} disabled={unavailable}>Log in</Button>
      </form>
      <p className="auth-switch">New to UniEventia? <button onClick={onSwitch} disabled={busy}>Register</button></p>
      <p className="auth-captcha">Protected by Google reCAPTCHA</p>
    </div>
  );
}
