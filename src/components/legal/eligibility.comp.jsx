import React, { useState } from "react";
import { Button, Input } from "antd";
import axios from "axios";
import { API_URL } from "../../api";
import { useAuth } from "../../authContext";
import { TERMS_VERSION, PRIVACY_VERSION } from "./eligibility";
import { TermsAgreement } from "./legalLinks.comp";
import { dateInputToIso } from "../../lib/dates";

export default function Eligibility({ onProfile }) {
  const { user, updateUser } = useAuth();
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const blocked = user?.ageStatus === "blocked";
  const submit = async e => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const { data } = await axios.post(`${API_URL}/users/profile/eligibility`, {
        dateOfBirth: dateInputToIso(dateOfBirth), acceptTerms, termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION,
      }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      setDateOfBirth(""); updateUser(data);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to confirm your age. Please try again.");
      if (err.response?.data?.underage) { setDateOfBirth(""); updateUser({ ...user, ageStatus: "blocked", adultConfirmedAt: null }); }
    } finally { setBusy(false); }
  };
  return <section className="eligibility-card" aria-labelledby="eligibility-title">
    <h2 id="eligibility-title">{blocked ? "Your account is restricted" : "Confirm your age to continue"}</h2>
    <p>UniEventia accounts are for people aged 18 and over. We keep an adult-confirmation record and the terms you accepted, not your date of birth.</p>
    {!blocked && <form className="auth-form" onSubmit={submit}>
      <label htmlFor="eligibility-birth">Date of birth</label>
      <Input id="eligibility-birth" type="text" inputMode="numeric" placeholder="DD/MM/YYYY" pattern="\d{2}/\d{2}/\d{4}" autoComplete="bday" required value={dateOfBirth} disabled={busy} onChange={e => setDateOfBirth(e.target.value)} />
      <TermsAgreement checked={acceptTerms} disabled={busy} onChange={e => setAcceptTerms(e.target.checked)} />
      <Button htmlType="submit" type="primary" loading={busy}>Confirm eligibility</Button>
    </form>}
    {error && <p role="alert" className="auth-error">{error}</p>}
    <p>You can still access, correct, export or delete your account data in Profile. If your age was entered incorrectly, contact <a href="mailto:Lena@fziyen.dev">Lena@fziyen.dev</a> to request a review.</p>
    {onProfile && <Button onClick={onProfile}>Open privacy controls</Button>}
  </section>;
}
