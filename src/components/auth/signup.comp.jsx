import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { message } from "antd";
import { Button, Card, Input } from "../ui/primitives";
import { useRecaptcha } from "./recaptcha";
import "../../Styles/Auth.styles.css";

export default function Signup() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirm: "",
    role: "Participant",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { getToken, unavailable: recaptchaUnavailable } =
    useRecaptcha("register");
  const navigate = useNavigate();

  const passwordChecks = useMemo(() => {
    const value = form.password || "";
    return [
      { label: "At least 8 characters", valid: value.length >= 8 },
      { label: "One uppercase letter", valid: /[A-Z]/.test(value) },
      { label: "One lowercase letter", valid: /[a-z]/.test(value) },
      { label: "One number", valid: /\d/.test(value) },
    ];
  }, [form.password]);

  const passwordIsValid = passwordChecks.every((rule) => rule.valid);

  const update = (field) => (event) =>
    setForm({ ...form, [field]: event.target.value });

  const onSubmit = async (event) => {
    event.preventDefault();
    if (recaptchaUnavailable) {
      return message.error(
        "Google reCAPTCHA is unavailable. Please refresh and try again.",
      );
    }
    if (form.password !== form.confirm)
      return message.error("The passwords do not match!");
    try {
      const recaptchaValue = await getToken();
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || "http://localhost:5030/api"}/auth/register`,
        {
          fname: form.firstName,
          lname: form.lastName,
          username: form.username,
          email: form.email,
          password: form.password,
          role: form.role,
          recaptcha: recaptchaValue,
        },
      );

      const { token, user } = response.data;
      if (token && user) {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
      }

      message.success(response.data.message || "Registration successful!");
      navigate(
        user?.role === "Organizer"
          ? "/organizer-layout"
          : "/participant-layout",
        {
          replace: true,
        },
      );
    } catch (error) {
      console.error("Registration failed:", error);
      message.error(
        error.response?.data?.message ||
          (error.message?.includes("reCAPTCHA") ? error.message : null) ||
          "Registration failed. Please try again.",
      );
    }
  };

  return (
    <main className="auth-page auth-page-signup">
      <div className="auth-topbar">
        <div className="auth-brand">
          <span className="brand-mark">
            <CalendarDays size={18} />
          </span>
          <strong>Uni</strong>Eventia
        </div>
      </div>
      <div className="auth-layout auth-layout-signup">
        <section className="auth-story">
          <p className="eyebrow">
            <UserRound size={14} /> Join UniEventia
          </p>
          <h1>Discover your next event.</h1>
          <p>
            Join a community events built around shared interests, generous
            hosting, and memorable days.
          </p>
        </section>
        <Card className="auth-card">
          <div className="auth-heading">
            <p className="auth-kicker">Get started</p>
            <h2>Create your account</h2>
            <p>It only takes a minute to find your rhythm.</p>
          </div>
          <form onSubmit={onSubmit} className="auth-form auth-form-grid">
            <label>
              First name
              <div className="input-with-icon">
                <UserRound size={17} />
                <Input
                  value={form.firstName}
                  onChange={update("firstName")}
                  placeholder="First name"
                  required
                  maxLength={50}
                />
              </div>
            </label>
            <label>
              Last name
              <div className="input-with-icon">
                <UserRound size={17} />
                <Input
                  value={form.lastName}
                  onChange={update("lastName")}
                  placeholder="Last name"
                  required
                  maxLength={50}
                />
              </div>
            </label>
            <div className="auth-row-split">
              <label className="auth-half">
                Username
                <div className="input-with-icon">
                  <UserRound size={17} />
                  <Input
                    value={form.username}
                    onChange={update("username")}
                    placeholder="Choose a unique username"
                    required
                    maxLength={25}
                  />
                </div>
              </label>
              <label className="auth-half">
                Role
                <select
                  className="ui-input"
                  value={form.role}
                  onChange={update("role")}
                >
                  <option>Participant</option>
                  <option>Organizer</option>
                </select>
              </label>
            </div>
            <label className="auth-full">
              UniEventia email
              <div className="input-with-icon">
                <Mail size={17} />
                <Input
                  type="email"
                  value={form.email}
                  onChange={update("email")}
                  placeholder="you@example.com"
                  required
                  maxLength={254}
                />
              </div>
            </label>
            <label className="auth-full">
              Password
              <div
                className={`input-with-icon password-input-wrap ${
                  form.password && !passwordIsValid ? "password-invalid" : ""
                }`}
              >
                <LockKeyhole size={17} />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={update("password")}
                  placeholder="Create a password"
                  required
                  maxLength={128}
                  className={
                    form.password && !passwordIsValid ? "input-invalid" : ""
                  }
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <ul className="password-rules">
                {passwordChecks.map((rule) => (
                  <li
                    key={rule.label}
                    className={rule.valid ? "is-valid" : "is-invalid"}
                  >
                    {rule.label}
                  </li>
                ))}
              </ul>
            </label>
            <label className="auth-full">
              Confirm password
              <div
                className={`input-with-icon password-input-wrap ${
                  form.confirm && form.password !== form.confirm
                    ? "password-invalid"
                    : ""
                }`}
              >
                <LockKeyhole size={17} />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.confirm}
                  onChange={update("confirm")}
                  placeholder="Repeat password"
                  required
                  maxLength={128}
                  className={
                    form.confirm && form.password !== form.confirm
                      ? "input-invalid"
                      : ""
                  }
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                  onClick={() => setShowConfirmPassword((value) => !value)}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
            </label>
            <div className="captcha-wrap auth-full">
              <span className="captcha-note">
                Protected by Google reCAPTCHA
              </span>
            </div>
            {recaptchaUnavailable && (
              <p className="captcha-fallback auth-full" role="status">
                Google reCAPTCHA could not load. Please refresh the page and try
                again.
              </p>
            )}
            <Button type="submit" className="auth-submit auth-full">
              Create account <ArrowRight size={17} />
            </Button>
          </form>
          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </Card>
      </div>
    </main>
  );
}
