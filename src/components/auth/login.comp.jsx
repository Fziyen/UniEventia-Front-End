import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { message } from "antd";
import { Button, Card, Input } from "../ui/primitives";
import { useRecaptcha } from "./recaptcha";
import "../../Styles/Auth.styles.css";

export default function Login() {
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const { getToken, unavailable: recaptchaUnavailable } = useRecaptcha("login");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== "/login") {
      return;
    }

    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (!token || !storedUser) {
      return;
    }

    try {
      const user = JSON.parse(storedUser);
      if (!user?.role) {
        return;
      }

      navigate(
        user.role === "Organizer" ? "/organizer-layout" : "/participant-layout",
        { replace: true },
      );
    } catch (error) {
      localStorage.removeItem("user");
    }
  }, [location.pathname, navigate]);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (recaptchaUnavailable) {
      message.error(
        "Google reCAPTCHA is unavailable. Please refresh and try again.",
      );
      return;
    }
    try {
      const recaptchaValue = await getToken();
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || "http://localhost:5030/api"}/auth/login`,
        { ...form, recaptcha: recaptchaValue },
      );
      const { token, user } = response.data || {};
      if (!token || !user) throw new Error("Invalid authentication response");
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      message.success("Logged in successfully!");
      navigate(
        user.role === "Organizer" ? "/organizer-layout" : "/participant-layout",
        { replace: true },
      );
    } catch (error) {
      console.error("Login failed:", error);
      message.error(
        error.response?.data?.message ||
          (error.message?.includes("reCAPTCHA")
            ? error.message
            : "Invalid email or password. Please try again."),
      );
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-orbit auth-orbit-one" />
      <div className="auth-orbit auth-orbit-two" />
      <div className="auth-topbar">
        <div className="auth-brand">
          <span className="brand-mark">
            <CalendarDays size={18} />
          </span>
          <strong>Uni</strong>Eventia
        </div>
      </div>
      <div className="auth-layout">
        <section className="auth-story">
          <p className="eyebrow">Events with intention</p>
          <h1>Events that matter.</h1>
          <p>
            Discover thoughtful gatherings, meet your people, and keep every
            detail in one calm place.
          </p>
          <div className="story-line">
            <span />
            <span /> <span />
          </div>
        </section>
        <Card className="auth-card">
          <div className="auth-heading">
            <p className="auth-kicker">Welcome back</p>
            <h2>Sign in to your space</h2>
            <p>Pick up where your next gathering begins.</p>
          </div>
          <form onSubmit={onSubmit} className="auth-form">
            <label>
              Username or email address
              <div className="input-with-icon">
                <Mail size={17} />
                <Input
                  type="text"
                  value={form.identifier}
                  onChange={(event) =>
                    setForm({ ...form, identifier: event.target.value })
                  }
                  placeholder="Enter your username or email"
                  required
                  maxLength={254}
                />
              </div>
            </label>
            <label>
              Password
              <div className="input-with-icon password-input-wrap">
                <LockKeyhole size={17} />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(event) =>
                    setForm({ ...form, password: event.target.value })
                  }
                  placeholder="Enter your password"
                  required
                  maxLength={128}
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
            </label>
            <div className="captcha-wrap">
              <span className="captcha-note">
                Protected by Google reCAPTCHA
              </span>
            </div>
            {recaptchaUnavailable && (
              <p className="captcha-fallback" role="status">
                Google reCAPTCHA could not load. Please refresh the page and try
                again.
              </p>
            )}
            <Button type="submit" className="auth-submit">
              Continue <ArrowRight size={17} />
            </Button>
          </form>
          <p className="auth-switch">
            New to UniEventia? <Link to="/register">Create an account</Link>
          </p>
        </Card>
      </div>
    </main>
  );
}
