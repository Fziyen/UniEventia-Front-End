import { dateInputToIso } from "../../lib/dates";

export const TERMS_VERSION = "2026-10-10";
export const PRIVACY_VERSION = "2026-10-10";
export const isEligible = user => user?.ageStatus === "adult" && Boolean(user.adultConfirmedAt) && user.termsVersion === TERMS_VERSION;
export function checkAdult(value, now = new Date()) {
  const isoValue = dateInputToIso(value);
  if (!isoValue) return "Enter a valid date of birth (DD/MM/YYYY).";
  const birth = new Date(`${isoValue}T00:00:00.000Z`);
  if (!Number.isFinite(birth.getTime()) || birth.toISOString().slice(0, 10) !== isoValue) return "Enter a valid date of birth (DD/MM/YYYY).";
  const today = now.toISOString().slice(0, 10);
  if (isoValue > today || birth.getUTCFullYear() < 1) return "Enter a valid date of birth (DD/MM/YYYY).";
  const age = now.getUTCFullYear() - birth.getUTCFullYear() - (today < `${now.getUTCFullYear()}${isoValue.slice(4)}` ? 1 : 0);
  return age < 18 ? "You must be at least 18 to use a UniEventia account." : "";
}
