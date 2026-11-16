import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import UserProfilePreview from "./userProfilePreview.comp";

jest.mock("axios", () => ({ get: jest.fn() }));
jest.mock("../../authContext", () => ({ useAuth: () => ({ requireAuth: () => true }) }));
window.matchMedia = query => ({ matches: false, media: query, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
window.getComputedStyle = () => ({ getPropertyValue: () => "", display: "block", visibility: "visible", overflow: "visible" });
const history = (items = []) => ({ visible: true, items, total: items.length, page: 1, pages: items.length ? 1 : 0 });
const event = { _id: "event1", title: "Community workshop", description: "An afternoon of learning together.", location: "Main hall", startDate: "2025-06-01T10:00:00Z", endDate: "2025-06-01T12:00:00Z" };
const profile = {
  _id: "member1", fname: "Ada", lname: "Lovelace", username: "ada", role: "Organizer", createdAt: "2024-01-01", bio: "Bringing the community together.",
  hosting: { visible: true, score: 2, reviewCount: 4, eventCount: 1 },
  hostedEvents: history([event]), participatedEvents: history([event]),
  writtenReviews: history([{ _id: "review1", event, rating: 4, comment: "A welcoming event.", createdAt: "2025-06-02" }]),
};
beforeEach(() => { jest.clearAllMocks(); axios.get.mockResolvedValue({ data: profile }); });

test("opens a fresh profile by exact identifier and shows hosted events and the overall score", async () => {
  render(<UserProfilePreview user={{ ...profile, _id: "exact-id" }}>Open member</UserProfilePreview>);
  fireEvent.click(screen.getByRole("button", { name: "Open member" }));
  expect(await screen.findByRole("heading", { name: "Ada Lovelace" })).toBeInTheDocument();
  expect(axios.get).toHaveBeenCalledWith(expect.stringContaining("/users/exact-id/public"), expect.any(Object));
  expect(screen.getByLabelText("Overall organizer rating")).toHaveTextContent("2.0/5");
  expect(screen.getByText("4 reviews across hosted events")).toBeInTheDocument();
  expect(screen.getByText("Community workshop")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("tab", { name: "Written reviews" }));
  expect(await screen.findByText("A welcoming event.")).toBeInTheDocument();
});
test("hidden histories expose neither entries nor counts, while host data remains visible", async () => {
  const hidden = { visible: false, items: [], total: null, page: 1, pages: 0 };
  axios.get.mockResolvedValue({ data: { ...profile, participatedEvents: hidden, writtenReviews: hidden } });
  render(<UserProfilePreview user={profile}>Open member</UserProfilePreview>);
  fireEvent.click(screen.getByRole("button", { name: "Open member" }));
  expect(await screen.findByLabelText("Overall organizer rating")).toHaveTextContent("2.0/5");
  expect(screen.getAllByText("Private")).toHaveLength(2);
  fireEvent.click(screen.getByRole("tab", { name: "Past participation" }));
  expect(await screen.findByText(/keeps their past participation history private/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("tab", { name: "Written reviews" }));
  expect(await screen.findByText(/keeps their written review history private/)).toBeInTheDocument();
  expect(screen.queryByText("A welcoming event.")).not.toBeInTheDocument();
});
test("participants get attendance and review histories without an organizer score", async () => {
  axios.get.mockResolvedValue({ data: { ...profile, role: "Participant", hosting: { visible: false }, hostedEvents: { visible: false } } });
  render(<UserProfilePreview user={profile}>Open member</UserProfilePreview>);
  fireEvent.click(screen.getByRole("button", { name: "Open member" }));
  expect(await screen.findByRole("tab", { name: "Past participation" })).toBeInTheDocument();
  expect(screen.queryByLabelText("Overall organizer rating")).not.toBeInTheDocument();
  expect(screen.queryByRole("tab", { name: /Hosted events/ })).not.toBeInTheDocument();
  expect(screen.getByText("Community workshop")).toBeInTheDocument();
});
test("closing during a load discards the response and reopening refreshes privacy choices", async () => {
  let resolve;
  axios.get.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  render(<UserProfilePreview user={profile}>Open member</UserProfilePreview>);
  fireEvent.click(screen.getByRole("button", { name: "Open member" }));
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  resolve({ data: profile });
  await waitFor(() => expect(screen.queryByRole("heading", { name: "Ada Lovelace" })).not.toBeInTheDocument());
  axios.get.mockResolvedValue({ data: { ...profile, bio: "Fresh profile data" } });
  fireEvent.click(screen.getByRole("button", { name: "Open member" }));
  expect(await screen.findByText("Fresh profile data")).toBeInTheDocument();
  expect(axios.get).toHaveBeenCalledTimes(2);
});
test("history pagination requests the next page from the server", async () => {
  axios.get.mockResolvedValue({ data: { ...profile, hostedEvents: { ...history([event]), total: 11, pages: 2 } } });
  render(<UserProfilePreview user={profile}>Open member</UserProfilePreview>);
  fireEvent.click(screen.getByRole("button", { name: "Open member" }));
  await screen.findByText("Community workshop");
  fireEvent.click(screen.getByTitle("2"));
  await waitFor(() => expect(axios.get).toHaveBeenLastCalledWith(expect.stringContaining("/users/member1/public"), expect.objectContaining({ params: { hostedPage: 2, participationPage: 1, reviewsPage: 1 } })));
});
