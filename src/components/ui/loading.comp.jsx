import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import "../../Styles/Loading.css";

export function ContentSkeleton({ variant = "events", count = 4, label = "Loading content" }) {
  return (
    <div className={`content-skeleton content-skeleton-${variant}`} role="status" aria-label={label}>
      <span className="loading-sr-only">{label}</span>
      <div className="skeleton-layout" aria-hidden="true">
        {Array.from({ length: variant === "profile" ? 1 : count }, (_, index) => (
          <div className="skeleton-card" key={index}>
            {(variant === "events" || variant === "feed") && <div className="skeleton-block skeleton-cover" />}
            <div className="skeleton-body">
              {(variant === "users" || variant === "profile" || variant === "list") && <div className="skeleton-block skeleton-avatar" />}
              <div className="skeleton-block skeleton-line skeleton-title" />
              <div className="skeleton-block skeleton-line" />
              <div className="skeleton-block skeleton-line skeleton-short" />
              {variant !== "list" && <div className="skeleton-block skeleton-line skeleton-meta" />}
              {variant === "profile" && <div className="skeleton-block skeleton-field" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Mount images so the browser can load them, but reveal the section as a unit.
// The hidden subtree is also removed from keyboard and screen-reader navigation.
function ImageReadyContent({ children, fallback }) {
  const contentRef = useRef(null);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    let cancelled = false;
    const cleanups = [];
    const images = Array.from(contentRef.current.querySelectorAll("img"));
    const pending = images.filter((image) => !image.complete);
    setReady(pending.length === 0);
    if (pending.length === 0) return;
    Promise.all(pending.map((image) => new Promise((resolve) => {
      const finish = () => {
        // React's error handler may have substituted a fallback image.
        queueMicrotask(() => {
          if (cancelled || !image.complete) return;
          resolve();
        });
      };
      image.addEventListener("load", finish);
      image.addEventListener("error", finish);
      cleanups.push(() => {
        image.removeEventListener("load", finish);
        image.removeEventListener("error", finish);
      });
      if (image.complete) resolve();
    }))).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [children]);

  return (
    <div className="loading-boundary" aria-busy={!ready}>
      {!ready && fallback}
      <div ref={contentRef} className={ready ? undefined : "loading-content-pending"} aria-hidden={ready ? undefined : true} inert={ready ? undefined : ""}>
        {children}
      </div>
    </div>
  );
}

export function LoadingContent({ loading = false, variant = "events", label, count, waitForImages = true, children }) {
  const fallback = <ContentSkeleton variant={variant} label={label} count={count} />;
  if (loading) return fallback;
  return waitForImages ? <ImageReadyContent fallback={fallback}>{children}</ImageReadyContent> : <>{children}</>;
}

// Defer mounting cards (and requesting their images) until close to the viewport.
// Each card then keeps its own skeleton until its images are ready.
export function LazyCard({ children, variant = "events", label = "Loading card" }) {
  const containerRef = useRef(null);
  const [nearViewport, setNearViewport] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    if (nearViewport) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setNearViewport(true);
        observer.disconnect();
      }
    }, { rootMargin: "300px 0px" });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [nearViewport]);

  return (
    <div ref={containerRef} className="lazy-card">
      <LoadingContent loading={!nearViewport} variant={variant} label={label} count={1}>
        {nearViewport ? children : null}
      </LoadingContent>
    </div>
  );
}
