import React, { act } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LoadingContent, LazyCard } from "./loading.comp";

const completeImage = (image, event = "load") => {
  Object.defineProperty(image, "complete", { configurable: true, value: true });
  fireEvent[event](image);
};

it("keeps data and actions out of the page while a request is pending", () => {
  render(<LoadingContent loading label="Loading events"><button>Join event</button></LoadingContent>);
  expect(screen.getByRole("status", { name: "Loading events" })).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

it("reveals the whole section only after every image finishes", async () => {
  const { container } = render(<LoadingContent><img src="one.jpg" alt="First" /><img src="two.jpg" alt="Second" /><button>Join event</button></LoadingContent>);
  const images = container.querySelectorAll("img");
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  completeImage(images[0]);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  completeImage(images[1]);
  expect(await screen.findByRole("button", { name: "Join event" })).toBeInTheDocument();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

it("releases the skeleton when an image fails instead of waiting forever", async () => {
  const { container } = render(<LoadingContent><img src="broken.jpg" alt="Cover" /><button>Open event</button></LoadingContent>);
  completeImage(container.querySelector("img"), "error");
  expect(await screen.findByRole("button", { name: "Open event" })).toBeInTheDocument();
});

it("waits for a replacement image after an error", async () => {
  const { container } = render(<LoadingContent><img src="broken.jpg" alt="Cover" onError={(event) => { event.currentTarget.src = "fallback.jpg"; Object.defineProperty(event.currentTarget, "complete", { configurable: true, value: false }); }} /><button>Open event</button></LoadingContent>);
  const image = container.querySelector("img");
  completeImage(image, "error");
  await waitFor(() => expect(image).toHaveAttribute("src", "fallback.jpg"));
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  completeImage(image);
  expect(await screen.findByRole("button")).toBeInTheDocument();
});

it("reveals text-only content immediately", () => {
  render(<LoadingContent><button>Read notification</button></LoadingContent>);
  expect(screen.getByRole("button")).toBeInTheDocument();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

it("returns to skeletons when another request starts", () => {
  const { rerender } = render(<LoadingContent><button>Old result</button></LoadingContent>);
  rerender(<LoadingContent loading><button>Old result</button></LoadingContent>);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toBeInTheDocument();
});


it("does not flash a skeleton for cached images", () => {
  const cached = jest.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
  try {
    render(<LoadingContent><img src="cached.jpg" alt="Cover" /><button>Open cached event</button></LoadingContent>);
    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  } finally {
    cached.mockRestore();
  }
});


describe("lazy cards", () => {
  let observers;
  let originalObserver;

  beforeEach(() => {
    observers = [];
    originalObserver = window.IntersectionObserver;
    window.IntersectionObserver = jest.fn((callback) => {
      const observer = { callback, observe: jest.fn(), disconnect: jest.fn() };
      observers.push(observer);
      return observer;
    });
  });

  afterEach(() => {
    window.IntersectionObserver = originalObserver;
  });

  it("defers offscreen image requests and reveals nearby cards independently", async () => {
    const { container } = render(<LoadingContent waitForImages={false}>
      <LazyCard><img src="near.jpg" alt="Near" /><button>Near event</button></LazyCard>
      <LazyCard><img src="far.jpg" alt="Far" /><button>Far event</button></LazyCard>
    </LoadingContent>);
    expect(container.querySelectorAll("img")).toHaveLength(0);
    act(() => observers[0].callback([{ isIntersecting: false }]));
    expect(container.querySelectorAll("img")).toHaveLength(0);
    act(() => observers[0].callback([{ isIntersecting: true }]));
    expect(container.querySelectorAll("img")).toHaveLength(1);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    completeImage(container.querySelector("img"));
    expect(await screen.findByRole("button", { name: "Near event" })).toBeInTheDocument();
    expect(container.querySelector('img[src="far.jpg"]')).toBeNull();
    expect(observers[0].disconnect).toHaveBeenCalled();
    act(() => observers[1].callback([{ isIntersecting: true }]));
    completeImage(container.querySelector('img[src="far.jpg"]'));
    expect(await screen.findByRole("button", { name: "Far event" })).toBeInTheDocument();
  });

  it("disconnects when an offscreen card is removed", () => {
    const { unmount } = render(<LazyCard><img src="far.jpg" alt="Far" /></LazyCard>);
    unmount();
    expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
  });

  it("loads normally when IntersectionObserver is unavailable", async () => {
    window.IntersectionObserver = undefined;
    const { container } = render(<LazyCard><img src="cover.jpg" alt="Cover" /><button>Open</button></LazyCard>);
    expect(container.querySelector("img")).toBeInTheDocument();
    completeImage(container.querySelector("img"));
    expect(await screen.findByRole("button", { name: "Open" })).toBeInTheDocument();
  });
});
