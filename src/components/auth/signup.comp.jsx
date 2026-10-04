import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Button, Input } from "antd";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useAuth } from "../../authContext";
import { useRecaptcha } from "./recaptcha";
import { API_URL } from "../../api";

const steps = ["Your name", "Account details", "Your role", "Set a password"];

export default function Signup({ onSuccess, onSwitch, busy, setBusy }) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState("forward");
  const [form, setForm] = useState({ fname: "", lname: "", username: "", email: "", role: "Participant", password: "", confirm: "" });
  const [error, setError] = useState("");
  const heading = useRef(null);
  const { login } = useAuth();
  const { getToken, unavailable } = useRecaptcha("register");
  const update = (field) => (e) => { setForm((current) => ({ ...current, [field]: e.target.value })); setError(""); };
  const passwordRules = [
    ["At least 8 characters, up to 72 bytes", form.password.length >= 8 && new Blob([form.password]).size <= 72],
    ["Uppercase letter", /[A-Z]/.test(form.password)],
    ["Lowercase letter", /[a-z]/.test(form.password)],
    ["Number", /\d/.test(form.password)],
  ];

  useEffect(() => { heading.current?.focus(); }, [step]);

  const goBack = () => { setDirection("back"); setError(""); setStep((current) => current - 1); };
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (step === 0 && (!form.fname.trim() || !form.lname.trim())) return setError("Enter your first and last name.");
    if (step === 1) {
      if (!/^[a-zA-Z0-9_-]{3,25}$/.test(form.username.trim())) return setError("Use 3–25 letters, numbers, underscores, or hyphens for your username.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) return setError("Enter a valid email address.");
    }
    if (step < 3) { setError(""); setDirection("forward"); setStep(step + 1); return; }
    if (!passwordRules.every(([, valid]) => valid)) return setError("Your password must meet all four requirements.");
    if (form.password !== form.confirm) return setError("The passwords do not match.");
    setError("");
    setBusy(true);
    try {
      const recaptcha = await getToken();
      const { confirm, ...details } = form;
      const response = await axios.post(`${API_URL}/auth/register`, { ...details, fname: form.fname.trim(), lname: form.lname.trim(), username: form.username.trim(), email: form.email.trim(), recaptcha });
      const { token, user } = response.data || {};
      if (!token || !user) throw new Error("Registration did not return a session. Please try logging in.");
      localStorage.setItem("token", token);
      login(user);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Could not create your account. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-flow">
      <div className="signup-progress-copy"><span>Create an account</span><span>Step {step + 1} of {steps.length}</span></div>
      <div className="signup-progress" role="progressbar" aria-label="Account setup" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={4}>
        {steps.map((name, index) => <span key={name} className={index <= step ? "is-complete" : ""} />)}
      </div>
      <form onSubmit={submit} className="signup-form">
        <div key={step} className={`signup-step ${direction}`}>
          <h2 ref={heading} tabIndex={-1}>{steps[step]}</h2>
          {step === 0 && <div className="auth-form">
            <label htmlFor="signup-first">First name</label><Input id="signup-first" autoComplete="given-name" required maxLength={50} value={form.fname} onChange={update("fname")} />
            <label htmlFor="signup-last">Last name</label><Input id="signup-last" autoComplete="family-name" required maxLength={50} value={form.lname} onChange={update("lname")} />
          </div>}
          {step === 1 && <div className="auth-form">
            <label htmlFor="signup-username">Username</label><Input id="signup-username" autoComplete="username" required minLength={3} maxLength={25} value={form.username} onChange={update("username")} />
            <label htmlFor="signup-email">Email address</label><Input id="signup-email" type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={update("email")} />
          </div>}
          {step === 2 && <fieldset className="signup-roles"><legend>How would you like to use UniEventia?</legend>
            {[ ["Participant", "Browse and join events."], ["Organizer", "Create and manage events."] ].map(([role, description]) => <label key={role} className={form.role === role ? "is-selected" : ""}>
              <input type="radio" name="role" value={role} checked={form.role === role} onChange={update("role")} /><span><strong>{role}</strong><small>{description}</small></span>
            </label>)}
          </fieldset>}
          {step === 3 && <div className="auth-form">
            <label htmlFor="signup-password">Password</label><Input.Password id="signup-password" autoComplete="new-password" required maxLength={128} value={form.password} disabled={busy} onChange={update("password")} aria-describedby="password-requirements" />
            <ul className="password-rules" id="password-requirements">{passwordRules.map(([label, valid]) => <li key={label} className={valid ? "is-valid" : ""}><Check size={12} aria-hidden="true" />{label}</li>)}</ul>
            <label htmlFor="signup-confirm">Confirm password</label><Input.Password id="signup-confirm" autoComplete="new-password" required maxLength={128} value={form.confirm} disabled={busy} onChange={update("confirm")} />
          </div>}
        </div>
        {error && <p className="auth-error" role="alert">{error}</p>}
        {step === 3 && unavailable && <p className="auth-error" role="status">reCAPTCHA is unavailable. Please refresh and try again.</p>}
        <div className="signup-actions">
          {step > 0 && <Button htmlType="button" onClick={goBack} disabled={busy}><ArrowLeft size={15} /> Back</Button>}
          <Button type="primary" htmlType="submit" loading={busy} disabled={step === 3 && unavailable}>{step === 3 ? "Create account" : <>Continue <ArrowRight size={15} /></>}</Button>
        </div>
      </form>
      <p className="auth-switch">Already have an account? <button onClick={onSwitch} disabled={busy}>Log in</button></p>
      <p className="auth-captcha">Protected by Google reCAPTCHA</p>
    </div>
  );
}
