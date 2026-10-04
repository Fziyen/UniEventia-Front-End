import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import { AuthProvider } from "../../authContext";
import UploadEvent, { eventDates, validateEventStep } from "./uploadEvent.comp";

jest.mock("axios", () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock("../../lib/compressImage", () => ({ compressImage: async (file) => file }));
window.matchMedia = (query) => ({ matches: false, media: query, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
window.getComputedStyle = () => ({ getPropertyValue: () => "", display: "block", visibility: "visible", overflow: "visible" });

const fill = (label, value) => fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
const next = () => fireEvent.click(screen.getByRole("button", { name: "Continue" }));
const open = async () => {
  render(<MemoryRouter><AuthProvider><UploadEvent /></AuthProvider></MemoryRouter>);
  await screen.findByLabelText("Title");
};
const details = () => { fill("Title", "Community meetup"); fill("Description", "An afternoon of shared ideas."); next(); };
const schedule = () => {
  fill("Start date", "2099-06-10"); fill("End date", "2099-06-10");
  fill("Start time", "14:00"); fill("End time", "16:00");
  fill("Location", "Main hall"); fill("Maximum participants", "25"); next();
};
const review = async () => { await open(); details(); schedule(); fireEvent.click(screen.getByRole("button", { name: "Preview event" })); };

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("token", "organizer-session");
  localStorage.setItem("user", JSON.stringify({ _id: "org1", fname: "Ada", lname: "Lovelace", role: "Organizer" }));
  jest.clearAllMocks();
  axios.get.mockResolvedValue({ data: [] });
  axios.post.mockResolvedValue({ data: { rateLimit: { remaining: 7 } } });
  URL.createObjectURL = jest.fn(() => "blob:test-cover");
  URL.revokeObjectURL = jest.fn();
});

it("keeps draft fields when moving back and does not publish during the steps", async () => {
  await open(); details();
  fill("Location", "Main hall");
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  expect(screen.getByLabelText("Title")).toHaveValue("Community meetup");
  next();
  expect(screen.getByLabelText("Location")).toHaveValue("Main hall");
  expect(axios.post).not.toHaveBeenCalled();
});

it("rejects reversed times and invalid capacity", async () => {
  await open(); details();
  fill("Start date", "2099-06-10"); fill("End date", "2099-06-10");
  fill("Start time", "16:00"); fill("End time", "14:00"); fill("Location", "Hall"); next();
  expect(screen.getByRole("alert")).toHaveTextContent("End time must be after");
  expect(validateEventStep({ startDay: "2099-06-10", endDay: "2099-06-11", startTime: "14:00", endTime: "16:00", location: "Hall", maxParticipants: 1.5 }, 1)).toContain("whole number");
  expect(axios.post).not.toHaveBeenCalled();
});

it("previews the expanded card and requires confirmation before the only POST", async () => {
  await review();
  expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  expect(screen.getByText("Main hall")).toBeInTheDocument();
  expect(screen.getByText("25")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Participate" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Add comment" })).toBeDisabled();
  const publish = screen.getByRole("button", { name: "Confirm and create event" });
  expect(publish).toBeDisabled(); expect(axios.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(publish);
  await screen.findByRole("heading", { name: "Event created" });
  expect(axios.post).toHaveBeenCalledTimes(1);
  const [url, body, options] = axios.post.mock.calls[0];
  expect(url).toMatch(/\/events$/);
  expect(body.get("title")).toBe("Community meetup");
  expect(body.get("maxParticipants")).toBe("25");
  expect(new Date(body.get("startDate")).getHours()).toBe(14);
  expect(new Date(body.get("endDate")).getHours()).toBe(16);
  expect(options.headers.Authorization).toBe("Bearer organizer-session");
});

it("requires a fresh confirmation after editing and keeps a failed submission available to retry", async () => {
  await review(); fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Edit event details" }));
  fill("Title", "Updated meetup"); next(); next();
  fireEvent.click(screen.getByRole("button", { name: "Preview event" }));
  expect(screen.getByRole("checkbox")).not.toBeChecked();
  axios.post.mockRejectedValueOnce({ response: { data: { message: "Please try again" } } });
  fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(screen.getByRole("button", { name: "Confirm and create event" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Please try again");
  expect(screen.getAllByText("Updated meetup").length).toBeGreaterThan(0);
  await waitFor(() => expect(screen.getByRole("button", { name: "Confirm and create event" })).not.toBeDisabled());
});

it("previews the prepared image and submits that same file", async () => {
  await open(); details(); schedule();
  const file = new File(["image"], "cover.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText("Cover image (optional)"), { target: { files: [file] } });
  expect(await screen.findByAltText("Selected event cover")).toHaveAttribute("src", "blob:test-cover");
  fireEvent.click(screen.getByRole("button", { name: "Preview event" }));
  expect(screen.getByAltText("Cover for Community meetup")).toHaveAttribute("src", "blob:test-cover");
  fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(screen.getByRole("button", { name: "Confirm and create event" }));
  await waitFor(() => expect(axios.post).toHaveBeenCalled());
  expect(axios.post.mock.calls[0][1].get("coverImage").name).toBe("cover.png");
});

it("requires both times and never substitutes full-day defaults", async () => {
  await open(); details();
  expect(screen.getByLabelText("Start time")).toBeRequired();
  expect(screen.getByLabelText("End time")).toBeRequired();
  const draft = { startDay: "2099-06-10", endDay: "2099-06-10", location: "Hall", maxParticipants: 25 };
  expect(validateEventStep(draft, 1)).toContain("both a start time and an end time");
  expect(validateEventStep({ ...draft, startTime: "14:00" }, 1)).toContain("both a start time and an end time");
  expect(validateEventStep({ ...draft, endTime: "16:00" }, 1)).toContain("both a start time and an end time");
  expect(Number.isNaN(eventDates(draft).start.getTime())).toBe(true);
  expect(validateEventStep({ ...draft, startTime: "00:00", endTime: "01:00" }, 1)).toBe("");
});

it("blocks publishing when the creation allowance is exhausted", async () => {
  axios.get.mockResolvedValue({ data: Array.from({ length: 8 }, () => ({ createdAt: new Date().toISOString() })) });
  await review(); fireEvent.click(screen.getByRole("checkbox"));
  expect(screen.getByRole("button", { name: "Confirm and create event" })).toBeDisabled();
  expect(axios.post).not.toHaveBeenCalled();
});

it("previews and submits all practical details", async () => {
  await open(); details(); schedule();
  fill("Language", "English and Finnish"); fill("Wheelchair access", "partial");
  fill("Cost", "Free"); fill("Transport", "Bus 10"); fill("What to bring", "Laptop");
  fireEvent.click(screen.getByRole("button", { name: "Preview event" }));
  expect(screen.getByText("English and Finnish")).toBeInTheDocument();
  expect(screen.getByText(/Partially accessible/)).toBeInTheDocument();
  expect(screen.getByText("Laptop")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Confirm and create event" }));
  await screen.findByRole("heading", { name: "Event created" });
  const body = axios.post.mock.calls[0][1];
  expect(body.get("language")).toBe("English and Finnish");
  expect(body.get("wheelchairAccess")).toBe("partial");
  expect(body.get("cost")).toBe("Free");
  expect(body.get("transport")).toBe("Bus 10");
  expect(body.get("whatToBring")).toBe("Laptop");
});
