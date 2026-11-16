import React from "react";
import { Link } from "react-router-dom";
export default function LegalLinks() {
  return <nav className="legal-links" aria-label="Legal and privacy">
    <Link to="/privacy">Privacy Policy</Link>
    <Link to="/terms">Terms of Use</Link>
    <Link to="/report">Report a concern</Link>
  </nav>;
}
export function TermsAgreement({ checked, onChange, disabled = false }) {
  return <label className="terms-agreement">
    <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} />
    <span>I agree to the <a href="/terms" target="_blank" rel="noreferrer">Terms of Use</a> and have read the <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.</span>
  </label>;
}
