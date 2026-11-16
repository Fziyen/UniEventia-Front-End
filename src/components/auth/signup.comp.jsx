import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Button, Input } from "antd";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useAuth } from "../../authContext";
import { checkAdult, TERMS_VERSION, PRIVACY_VERSION } from "../legal/eligibility";
import { TermsAgreement } from "../legal/legalLinks.comp";
import { API_URL } from "../../api";
import { dateInputToIso } from "../../lib/dates";

const steps = ["Eligibility", "Your name", "Account details", "Set a password"];

export default function Signup({ onSuccess, onSwitch, busy, setBusy }) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState("forward");
  const [form, setForm] = useState({ dateOfBirth: "", acceptTerms: false, fname: "", lname: "", username: "", email: "", role: "Participant", password: "", confirm: "" });
  const [error, setError] = useState("");
  const heading = useRef(null);
  const { login } = useAuth();
  const [ageDenied, setAgeDenied] = useState(() => sessionStorage.getItem("unieventia-age-blocked") === "1");
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
    if (busy || ageDenied) return;
    if (step === 0) {
      const ageError = checkAdult(form.dateOfBirth);
      if (ageError) {
        if (ageError.includes("at least 18")) { setAgeDenied(true); sessionStorage.setItem("unieventia-age-blocked", "1"); setForm(current => ({ ...current, dateOfBirth: "" })); }
        return setError(ageError);
      }
    }
    if (step === 1 && (!form.fname.trim() || !form.lname.trim())) return setError("Enter your first and last name.");
    if (step === 2) {
      if (!/^[a-zA-Z0-9_-]{3,25}$/.test(form.username.trim())) return setError("Use 3–25 letters, numbers, underscores, or hyphens for your username.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) return setError("Enter a valid email address.");
    }
    if (step < 3) { setError(""); setDirection("forward"); setStep(step + 1); return; }
    if (!passwordRules.every(([, valid]) => valid)) return setError("Your password must meet all four requirements.");
    if (form.password !== form.confirm) return setError("The passwords do not match.");
    if (!form.acceptTerms) return setError("Read the Privacy Policy and agree to the Terms of Use to create an account.");
    setError("");
    setBusy(true);
    try {
      const { confirm, ...details } = form;
      const response = await axios.post(`${API_URL}/auth/register`, { ...details, dateOfBirth: dateInputToIso(form.dateOfBirth), fname: form.fname.trim(), lname: form.lname.trim(), username: form.username.trim(), email: form.email.trim(), termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION });
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
      <div className="signup-progress" role="progressbar" aria-label="Account setup" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={steps.length}>
        {steps.map((name, index) => <span key={name} className={index <= step ? "is-complete" : ""} />)}
      </div>
      <form onSubmit={submit} className="signup-form">
        <div key={step} className={`signup-step ${direction}`}>
          <h2 ref={heading} tabIndex={-1}>{steps[step]}</h2>
          {step === 0 && <div className="auth-form">
            <p>You must be at least 18 to create an account. Your date of birth is checked but not stored.</p>
            <label htmlFor="signup-birth">Date of birth</label><Input id="signup-birth" type="text" inputMode="numeric" placeholder="DD/MM/YYYY" pattern="\d{2}/\d{2}/\d{4}" autoComplete="bday" required disabled={ageDenied} value={form.dateOfBirth} onChange={update("dateOfBirth")} />
            <p><a href="/privacy" target="_blank" rel="noreferrer">How we handle your data</a></p>
          </div>}
          {step === 1 && <div className="auth-form">
            <p>Your name and username are public. Your bio and photo, if added, and event contributions and participation are also visible to visitors. Your email starts private.</p>
            <label htmlFor="signup-first">First name</label><Input id="signup-first" autoComplete="given-name" required maxLength={50} value={form.fname} onChange={update("fname")} />
            <label htmlFor="signup-last">Last name</label><Input id="signup-last" autoComplete="family-name" required maxLength={50} value={form.lname} onChange={update("lname")} />
          </div>}
          {step === 2 && <div className="auth-form">
            <label htmlFor="signup-username">Username</label><Input id="signup-username" autoComplete="username" required minLength={3} maxLength={25} value={form.username} onChange={update("username")} />
            <label htmlFor="signup-email">Email address</label><Input id="signup-email" type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={update("email")} />
          </div>}
          {step === 3 && <div className="auth-form">
            <label htmlFor="signup-password">Password</label><Input.Password id="signup-password" autoComplete="new-password" required maxLength={128} value={form.password} disabled={busy} onChange={update("password")} aria-describedby="password-requirements" />
            <ul className="password-rules" id="password-requirements">{passwordRules.map(([label, valid]) => <li key={label} className={valid ? "is-valid" : ""}><Check size={12} aria-hidden="true" />{label}</li>)}</ul>
            <label htmlFor="signup-confirm">Confirm password</label><Input.Password id="signup-confirm" autoComplete="new-password" required maxLength={128} value={form.confirm} disabled={busy} onChange={update("confirm")} />
          <TermsAgreement checked={form.acceptTerms} disabled={busy} onChange={e => setForm(current => ({ ...current, acceptTerms: e.target.checked }))} />
          <p className="auth-captcha">We use account details to run your account, events and security. Optional profile details are your choice. There are no advertising or marketing subscriptions.</p>
          </div>}
        </div>
        {error && <p className="auth-error" role="alert">{error}</p>}
        {ageDenied && <p role="status">Registration is unavailable in this session. For help, contact <a href="mailto:Lena@fziyen.dev">Lena@fziyen.dev</a>.</p>}
        <div className="signup-actions">
          {step > 0 && <Button htmlType="button" onClick={goBack} disabled={busy}><ArrowLeft size={15} /> Back</Button>}
          <Button type="primary" htmlType="submit" loading={busy} disabled={ageDenied}>{step === 3 ? "Create account" : <>Continue <ArrowRight size={15} /></>}</Button>
        </div>
      </form>
      <p className="auth-switch">Already have an account? <button onClick={onSwitch} disabled={busy}>Log in</button></p>

    </div>
  );
}
