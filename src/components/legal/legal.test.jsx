import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import LegalPage from "./legalPage.comp";
import Signup from "../auth/signup.comp";
import { AuthProvider } from "../../authContext";
import { checkAdult } from "./eligibility";

// Ant Design selectors are unsupported by this legacy jsdom; these tests check behavior.
window.getComputedStyle = () => ({ getPropertyValue: () => "", display: "block", visibility: "visible", overflow: "visible" });

jest.mock("axios", () => ({ get: jest.fn(), post: jest.fn() }));
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); jest.clearAllMocks();
  window.scrollTo = jest.fn();
  axios.get.mockResolvedValue({ data: { operatorName: "Lena Fziyen", country: "Finland", privacyEmail: "Lena@fziyen.dev", ready: false } });
});
test("18th birthday and invalid calendar dates are checked in the browser", () => {
  const today = new Date("2026-10-10T12:00:00Z");
  expect(checkAdult("2008-10-10", today)).toBe("");
  expect(checkAdult("2008-10-11", today)).toMatch(/at least 18/);
  expect(checkAdult("2008-02-30", today)).toMatch(/valid/);
});
test("underage signup stops before identity fields and never calls the API", () => {
  render(<AuthProvider><Signup setBusy={jest.fn()} /></AuthProvider>);
  expect(screen.queryByLabelText("Email address")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Date of birth"), { target: { value: "2020-01-01" } });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect(screen.getByRole("alert")).toHaveTextContent("at least 18");
  expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  expect(axios.post).not.toHaveBeenCalled(); expect(axios.get).not.toHaveBeenCalled();
  expect(document.querySelector('script[src*="google"]')).toBeNull();
  expect(sessionStorage.getItem("unieventia-age-blocked")).toBe("1");
  expect(screen.getByLabelText("Date of birth")).toHaveValue("");
});
test.each([["privacy", "Privacy Policy"], ["terms", "Terms of Use"], ["report", "Report a concern"]])("%s is publicly readable with operator contact and navigation", async (type, title) => {
  render(<MemoryRouter><LegalPage type={type} /></MemoryRouter>);
  expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByText("Loading operator information…")).not.toBeInTheDocument());
  expect(screen.getAllByRole("link", { name: "Lena@fziyen.dev" }).length).toBeGreaterThan(0);
  expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
  expect(screen.getByRole("status")).toHaveTextContent("registrations remain closed");
});
test("provider lookup failure still shows a usable privacy contact", async () => {
  axios.get.mockRejectedValue(new Error("offline"));
  render(<MemoryRouter><LegalPage /></MemoryRouter>);
  expect(await screen.findByRole("alert")).toHaveTextContent("could not load");
  expect(screen.getAllByRole("link", { name: "Lena@fziyen.dev" }).length).toBeGreaterThan(0);
});
