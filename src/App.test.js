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

jest.mock("./components/auth/recaptcha", () => ({
  useRecaptcha: () => ({ getToken: async () => "test-captcha", unavailable: false }),
}));

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
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

describe("Guest access", () => {
  beforeEach(() => {
    localStorage.clear();
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
    jest.clearAllMocks();
    axios.get.mockResolvedValue({ data: [] });
  });
  const fill = (label, value) => fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
  const next = () => fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  const enterName = () => { fill("First name", "Ada"); fill("Last name", "Lovelace"); next(); };
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
    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();
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
    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();
  });
  it("validates passwords then creates the account with the selected role", async () => {
    axios.post.mockResolvedValue({ data: { token: "session", user: { _id: "1", fname: "Ada", role: "Participant" } } });
    openApp("/register"); enterName(); enterAccount();
    expect(screen.getByRole("radio", { name: /Participant/ })).toBeChecked();
    next();
    fill("Password", "weak"); fill("Confirm password", "weak");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByRole("alert")).toHaveTextContent("all four requirements");
    expect(axios.post).not.toHaveBeenCalled();
    fill("Password", "Password123"); fill("Confirm password", "Password124");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByRole("alert")).toHaveTextContent("do not match");
    fill("Confirm password", "Password123");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(localStorage.getItem("token")).toBe("session"));
    expect(axios.post).toHaveBeenCalledWith(expect.stringContaining("/auth/register"), {
      fname: "Ada", lname: "Lovelace", username: "ada_123", email: "ada@example.com", role: "Participant", password: "Password123", recaptcha: "test-captcha",
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
