import { act } from "react";
import { expireSession } from "./session";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import App from "./App";
import { AuthProvider } from "./authContext";

// Routing tests assume cached images; loading behavior is covered separately.
let imageComplete;
beforeEach(() => {
  imageComplete = jest.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
});
afterAll(() => imageComplete.mockRestore());

window.matchMedia =
  ((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  },
}));

// jsdom does not support the modern selectors in Ant Design's injected CSS.
// These behavior tests do not depend on computed layout.
window.getComputedStyle = () => ({
  getPropertyValue: () => "",
  display: "block",
  visibility: "visible",
  overflow: "visible",
});

describe("App routing", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.clearAllMocks();
    axios.get.mockResolvedValue({ data: [
      { _id: "future", title: "Future gathering", endDate: "2099-01-02", startDate: "2099-01-01", participants: [] },
      { _id: "past", title: "Past gathering", endDate: "2020-01-02", startDate: "2020-01-01", participants: [] },
    ] });
  });

  it("redirects unauthenticated users away from protected layouts", () => {
    render(
      <MemoryRouter initialEntries={["/organizer-layout"]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Log in" })).toBeInTheDocument();
  });
});

const openApp = (path = "/Dashboard") => render(<MemoryRouter initialEntries={[path]}><AuthProvider><App /></AuthProvider></MemoryRouter>);

describe("Role workspaces", () => {
  const participant = { _id: "member", username: "ada", fname: "Ada", lname: "Lovelace", email: "ada@example.com", role: "Participant", ageStatus: "adult", adultConfirmedAt: "2026-10-10", termsVersion: "2026-10-10" };
  const seed = user => {
    localStorage.setItem("token", "session");
    localStorage.setItem("user", JSON.stringify(user));
  };
  beforeEach(() => {
    localStorage.clear(); jest.clearAllMocks();
    axios.get.mockImplementation(url => Promise.resolve({ data: url.endsWith("/users/profile") ? participant : url.includes("/administrator/") ? { items: [], total: 0, approvalMode: "manual" } : [] }));
  });
  it("lets administrators reach administration, organizer tools and their own events", async () => {
    seed({ ...participant, role: "Administrator" });
    openApp();
    expect(screen.getByRole("button", { name: "Create event" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manage events" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "My events" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Administration", exact: true }));
    expect(await screen.findByRole("tab", { name: "Organizer requests" })).toBeInTheDocument();
    await waitFor(() => expect(axios.get).toHaveBeenCalledWith(expect.stringContaining("/administrator/users"), expect.objectContaining({ params: expect.objectContaining({ pending: true }) })));
    expect(await screen.findByText("Manual review")).toBeInTheDocument();
  });
  it("requests organizer access from Profile and immediately opens organizer navigation after automatic approval", async () => {
    seed(participant); localStorage.setItem("activePage", "Profile");
    const approved = { ...participant, role: "Organizer", organizerRequest: { status: "approved" } };
    axios.post.mockResolvedValue({ data: { user: approved, message: "Organizer request approved." } });
    axios.get.mockImplementation(url => Promise.resolve({ data: url.endsWith("/users/profile") ? JSON.parse(localStorage.getItem("user")) : [] }));
    openApp();
    fireEvent.click(await screen.findByRole("button", { name: "Request organizer access" }));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith(expect.stringContaining("/users/profile/organizer-request"), {}, expect.any(Object)));
    expect(await screen.findByRole("button", { name: "Create event" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Account role" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Administration", exact: true })).not.toBeInTheDocument();
  });
  it("keeps pending applicants as participants and lets them refresh a manual decision", async () => {
    const pending = { ...participant, organizerRequest: { status: "pending" } };
    seed(pending); localStorage.setItem("activePage", "Profile");
    axios.get.mockImplementation(url => Promise.resolve({ data: url.endsWith("/users/profile") ? pending : [] }));
    openApp();
    expect(await screen.findByText("Your request is awaiting administrator review.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create event" })).not.toBeInTheDocument();
    const approved = { ...participant, role: "Organizer", organizerRequest: { status: "approved" } };
    axios.get.mockImplementation(url => Promise.resolve({ data: url.endsWith("/users/profile") ? approved : [] }));
    fireEvent.click(screen.getByRole("button", { name: "Check request status" }));
    expect(await screen.findByRole("button", { name: "Create event" })).toBeInTheDocument();
  });
  it("defaults profile histories to public and saves independent privacy choices", async () => {
    seed(participant); localStorage.setItem("activePage", "Profile");
    axios.put.mockResolvedValue({ data: { ...participant, participationHistoryPublic: false, reviewHistoryPublic: true } });
    openApp();
    const participationSwitch = await screen.findByRole("switch", { name: "Show past participation on my profile" });
    const reviewSwitch = screen.getByRole("switch", { name: "Show written reviews on my profile" });
    expect(participationSwitch).toBeChecked(); expect(reviewSwitch).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: /Edit profile$/ }));
    fireEvent.click(participationSwitch);
    fireEvent.click(screen.getAllByRole("button", { name: /Save changes$/ })[0]);
    await waitFor(() => expect(axios.put).toHaveBeenCalledWith(expect.stringContaining("/users/profile"), expect.objectContaining({ participationHistoryPublic: false, reviewHistoryPublic: true }), expect.any(Object)));
  });
  it("lets an organizer return to Participant from Profile after confirmation", async () => {
    const organizer = { ...participant, role: "Organizer" };
    seed(organizer); localStorage.setItem("activePage", "Profile");
    axios.get.mockImplementation(url => Promise.resolve({ data: url.endsWith("/users/profile") ? JSON.parse(localStorage.getItem("user")) : [] }));
    axios.delete.mockResolvedValue({ data: { user: participant, message: "You are now a participant." } });
    openApp();
    fireEvent.click(await screen.findByRole("button", { name: "Remove organizer role" }));
    expect(axios.delete).not.toHaveBeenCalled();
    const confirm = await screen.findByRole("button", { name: "Return to Participant", exact: true });
    expect(screen.getByText(/You will lose access to creating and managing events/)).toBeInTheDocument();
    fireEvent.click(confirm);
    await waitFor(() => expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining("/users/profile/organizer-role"), expect.any(Object)));
    expect(await screen.findByRole("button", { name: "Request organizer access" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create event" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Manage events" })).not.toBeInTheDocument();
  });
  it("lets administrators change ordinary account roles with password confirmation", async () => {
    seed({ ...participant, role: "Administrator" }); localStorage.setItem("activePage", "Administration");
    axios.get.mockImplementation(url => Promise.resolve({ data: url.includes("/administrator/") ? { items: [{ ...participant, _id: "target" }], total: 1 } : [] }));
    axios.patch.mockResolvedValue({ data: { message: "Role changed to Organizer." } });
    openApp();
    fireEvent.click(await screen.findByRole("tab", { name: "All accounts" }));
    fireEvent.click(await screen.findByRole("button", { name: "Change role", exact: true }));
    expect(screen.getByRole("button", { name: "Save role" })).toBeDisabled();
    // The dialog defaults to the other ordinary role and never offers Administrator.
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "New role" }));
    expect(await screen.findByRole("option", { name: "Participant", exact: true })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Organizer", exact: true })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Administrator" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Your current administrator password"), { target: { value: "Password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Save role" }));
    await waitFor(() => expect(axios.patch).toHaveBeenCalledWith(expect.stringContaining("/administrator/users/target/role"), { role: "Organizer", expectedRole: "Participant", password: "Password123" }, expect.any(Object)));
  });
  it("requires the target username and acting administrator password before account deletion", async () => {
    seed({ ...participant, role: "Administrator" }); localStorage.setItem("activePage", "Administration");
    axios.get.mockImplementation(url => Promise.resolve({ data: url.includes("/administrator/") ? { items: [{ ...participant, _id: "target" }], total: 1, approvalMode: "manual" } : [] }));
    axios.delete.mockResolvedValue({ data: {} });
    openApp();
    fireEvent.click(await screen.findByRole("tab", { name: "All accounts" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete account", exact: true }));
    const confirm = screen.getByRole("button", { name: "Delete permanently" });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Your current administrator password"), { target: { value: "Password123" } });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Type the account username to confirm"), { target: { value: participant.username } });
    expect(confirm).not.toBeDisabled();
    fireEvent.click(confirm);
    await waitFor(() => expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining("/administrator/users/target"), expect.objectContaining({ data: { password: "Password123", confirmUsername: participant.username } })));
  });
  it("lets administrators ban and unban email addresses with password confirmation", async () => {
    seed({ ...participant, role: "Administrator" }); localStorage.setItem("activePage", "Administration");
    let bans = [];
    axios.get.mockImplementation(url => Promise.resolve({ data: url.includes("/administrator/") ? { items: url.includes("email-bans") ? bans : [], total: bans.length } : [] }));
    axios.post.mockImplementation(() => { bans = [{ _id: "ban1", email: "banned@example.com", createdAt: "2026-10-23" }]; return Promise.resolve({ data: {} }); });
    axios.delete.mockImplementation(() => { bans = []; return Promise.resolve({ data: {} }); });
    openApp();
    fireEvent.click(await screen.findByRole("tab", { name: "Banned emails" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Ban email", exact: true })).not.toBeDisabled());
    fireEvent.change(screen.getByLabelText("Email address to ban"), { target: { value: "BANNED@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Ban email", exact: true }));
    const confirm = screen.getByRole("button", { name: "Confirm email ban" });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Your current administrator password"), { target: { value: "Password123" } });
    fireEvent.click(confirm);
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith(expect.stringContaining("/administrator/email-bans"), { email: "banned@example.com", password: "Password123" }, expect.any(Object)));
    fireEvent.click(await screen.findByRole("button", { name: "Unban email", exact: true }));
    const remove = screen.getByRole("button", { name: "Remove ban" });
    expect(remove).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Your current administrator password"), { target: { value: "Password123" } });
    fireEvent.click(remove);
    await waitFor(() => expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining("/administrator/email-bans/ban1"), expect.objectContaining({ data: { password: "Password123" } })));
  });
  it.each([["Comments", "comment", "comments"], ["Reviews", "review", "reviews"]])("deletes %s even when the associated event is missing", async (label, singular, type) => {
    seed({ ...participant, role: "Administrator" }); localStorage.setItem("activePage", "Administration");
    const entry = { _id: "content1", user: { username: "member" }, event: null, text: "Comment text", comment: "Review text", rating: 3 };
    axios.get.mockImplementation(url => Promise.resolve({ data: url.includes("/administrator/") ? { items: url.includes("/content") ? [entry] : [], total: 1 } : [] }));
    axios.delete.mockResolvedValue({ data: {} });
    openApp();
    fireEvent.click(await screen.findByRole("tab", { name: label, exact: true }));
    fireEvent.click(await screen.findByRole("button", { name: `Delete ${singular}`, exact: true }));
    expect(screen.getByRole("button", { name: "Delete permanently" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Your current administrator password"), { target: { value: "Password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Delete permanently" }));
    await waitFor(() => expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining("/administrator/content/content1"), expect.objectContaining({ params: { type }, data: { password: "Password123" } })));
  });
});

describe("Guest access", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.clearAllMocks();
    axios.get.mockResolvedValue({ data: [
      { _id: "future", title: "Future gathering", endDate: "2099-01-02", startDate: "2099-01-01", participants: [] },
      { _id: "past", title: "Past gathering", endDate: "2020-01-02", startDate: "2020-01-01", participants: [] },
    ] });
  });
  it("starts on the landing page with guest access", () => {
    openApp("/");
    expect(screen.getByRole("link", { name: /explore events/i })).toHaveAttribute("href", "/Dashboard");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Discover events on UniEventia");
  });
  it("lets guests browse current and past events", async () => {
    openApp();
    expect(await screen.findByText("Future gathering")).toBeInTheDocument();
    expect(screen.queryByText("Past gathering")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Past events" }));
    expect(await screen.findByText("Past gathering")).toBeInTheDocument();
    expect(screen.queryByText("Future gathering")).not.toBeInTheDocument();
  });
  it.each(["Community", "Profile", "My events", "Notifications"])("prompts before opening %s without requesting protected data", async (section) => {
    openApp();
    await screen.findByText("Future gathering");
    fireEvent.click(screen.getByRole("button", { name: section, exact: true }));
    expect(await screen.findByRole("button", { name: "Register", exact: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log in", exact: true })).toBeInTheDocument();
    expect(axios.get.mock.calls.every(([url]) => url.endsWith("/events"))).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Keep exploring" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
  it("does not restore protected Community content for a guest", async () => {
    localStorage.setItem("activePage", "Users");
    openApp();
    expect(await screen.findByText("Future gathering")).toBeInTheDocument();
    expect(axios.get.mock.calls.every(([url]) => url.endsWith("/events"))).toBe(true);
  });
  it.each(["Participate", "Add comment"])("prompts for %s without sending a mutation", async (action) => {
    openApp();
    fireEvent.click(await screen.findByText("Future gathering"));
    fireEvent.click(await screen.findByRole("button", { name: action }));
    expect(await screen.findByText(/Log in or create an account to/)).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();
    expect(axios.put).not.toHaveBeenCalled();
  });
});

describe("Authentication popup", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.clearAllMocks();
    axios.get.mockResolvedValue({ data: [] });
  });
  const fill = (label, value) => fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
  const next = () => fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  const enterName = () => { fill("Date of birth", "1990-01-01"); next(); fill("First name", "Ada"); fill("Last name", "Lovelace"); next(); };
  const enterAccount = () => { fill("Username", "ada_123"); fill("Email address", "ada@example.com"); next(); };

  it("opens and dismisses login while keeping the landing page behind it", async () => {
    openApp("/");
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Discover events/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Keep exploring" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Discover events");
  });
  it("supports an old register link as a popup and preserves entries when going back", () => {
    openApp("/register");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Discover events/)).toBeInTheDocument();
    enterName();
    expect(screen.getByText("Step 3 of 4")).toBeInTheDocument();
    fill("Username", "ada_123");
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText("First name")).toHaveValue("Ada");
    next();
    expect(screen.getByLabelText("Username")).toHaveValue("ada_123");
    expect(axios.post).not.toHaveBeenCalled();
  });
  it("validates the username before advancing", () => {
    openApp("/register"); enterName();
    fill("Username", "a!"); fill("Email address", "ada@example.com"); next();
    expect(screen.getByRole("alert")).toHaveTextContent("Use 3–25");
    expect(screen.getByText("Step 3 of 4")).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();
  });
  it("validates passwords and registers a participant without a role selector", async () => {
    axios.post.mockResolvedValue({ data: { token: "session", user: { _id: "1", fname: "Ada", role: "Participant" } } });
    openApp("/register"); enterName(); enterAccount();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    fill("Password", "weak"); fill("Confirm password", "weak");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByRole("alert")).toHaveTextContent("all four requirements");
    expect(axios.post).not.toHaveBeenCalled();
    fill("Password", "Password123"); fill("Confirm password", "Password124");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByRole("alert")).toHaveTextContent("do not match");
    fill("Confirm password", "Password123");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(localStorage.getItem("token")).toBe("session"));
    expect(axios.post).toHaveBeenCalledWith(expect.stringContaining("/auth/register"), {
      fname: "Ada", lname: "Lovelace", username: "ada_123", email: "ada@example.com", role: "Participant", password: "Password123", dateOfBirth: "1990-01-01", acceptTerms: true, termsVersion: "2026-10-10", privacyVersion: "2026-10-10",
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
  it("keeps login errors in the popup and allows retry", async () => {
    axios.post.mockRejectedValueOnce({ response: { data: { message: "Invalid password" } } });
    openApp("/login");
    fill("Username or email address", "ada"); fill("Password", "Password123");
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Log in", exact: true }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid password");
    expect(screen.getByLabelText("Username or email address")).toHaveValue("ada");
    axios.post.mockResolvedValueOnce({ data: { token: "session", user: { _id: "1", role: "Participant" } } });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Log in", exact: true }));
    await waitFor(() => expect(localStorage.getItem("token")).toBe("session"));
  });
});

describe("Session recovery", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.clearAllMocks();
    axios.get.mockResolvedValue({ data: [] });
  });
  it("opens the login prompt on session rejection and restores access after login", async () => {
    const user = { _id: "1", fname: "Ada", role: "Participant", ageStatus: "adult", adultConfirmedAt: "2026-10-10", termsVersion: "2026-10-10" };
    localStorage.setItem("token", "rejected-session");
    localStorage.setItem("user", JSON.stringify(user));
    openApp();
    act(() => expireSession("rejected-session"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Please log in again to continue");
    expect(localStorage.getItem("token")).toBeNull();
    expect(screen.getByRole("button", { name: "Log in / Register" })).toBeInTheDocument();
    axios.post.mockResolvedValueOnce({ data: { token: "fresh-session", user } });
    fireEvent.change(screen.getByLabelText("Username or email address"), { target: { value: "ada" } });
    fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "Password123" } });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Log in", exact: true }));
    await waitFor(() => expect(localStorage.getItem("token")).toBe("fresh-session"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    act(() => expireSession("rejected-session"));
    expect(localStorage.getItem("token")).toBe("fresh-session");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
