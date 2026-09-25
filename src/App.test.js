import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./authContext";

window.matchMedia =
  window.matchMedia ||
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
  },
}));

describe("App routing", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("redirects unauthenticated users away from protected layouts", () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/organizer-layout"]}>
          <App />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
  });
});
