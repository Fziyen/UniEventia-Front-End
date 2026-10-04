import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, ImageIcon, Check } from "lucide-react";
import { useAuth } from "../authContext";
import "../Styles/Landing.styles.css";
import dashboardScreenshot from "../uploads/dashboard.webp";
import eventPreviewScreenshot from "../uploads/event-preview.webp";

function ScreenshotFrame({ src, label, caption }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <figure className="landing-screenshot">
      <div className="landing-screenshot-bar" aria-hidden="true">
        <span className="screenshot-window-dots">
          <i />
          <i />
          <i />
        </span>
        <span>UniEventia / {label}</span>
      </div>
      <div className="landing-screenshot-image">
        {!loaded && (
          <div className="landing-screenshot-placeholder">
            <ImageIcon size={32} strokeWidth={1.2} aria-hidden="true" />
            <span>{label} screenshot</span>
          </div>
        )}
        {!failed && (
          <img
            src={src}
            alt={caption}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            style={{ opacity: loaded ? 1 : 0 }}
          />
        )}
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

export default function Landing() {
  const { isAuthenticated, openAuth } = useAuth();
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <Link className="landing-brand" to="/" aria-label="UniEventia home">
          <span className="landing-brand-mark">
            <CalendarDays size={20} />
          </span>
          <span>
            <strong>Uni</strong>Eventia
          </span>
        </Link>
        <nav aria-label="Landing navigation">
          <a className="landing-how-link" href="#how-it-works">
            How it works
          </a>
          {isAuthenticated ? (
            <Link to="/Dashboard">Dashboard</Link>
          ) : (
            <>
              <button onClick={() => openAuth("login")}>Log in</button>
              <button
                className="landing-register"
                onClick={() => openAuth("register")}
              >
                Sign up
              </button>
            </>
          )}
        </nav>
      </header>

      <section className="landing-hero landing-container">
        <h1>
          Discover events
          <br /> on UniEventia
        </h1>
        <p>
          Find an event, see the details, and join. Or create your own and
          manage everything in one place.
        </p>
        <div className="landing-actions">
          <Link className="landing-button" to="/Dashboard">
            Explore events <ArrowRight size={17} />
          </Link>
          {!isAuthenticated && (
            <button
              className="landing-secondary"
              onClick={() => openAuth("register")}
            >
              Create an account
            </button>
          )}
        </div>
        <span className="landing-guest-note">
          <Check size={14} aria-hidden="true" /> No account needed to browse.
        </span>
      </section>

      <section
        className="landing-showcase landing-container"
        aria-labelledby="discover-heading"
      >
        <div className="landing-section-heading">
          <h2 id="discover-heading">See what’s happening.</h2>
          <p>
            Browse current and past events. Open a card for the date, location,
            organizer, and available places.
          </p>
        </div>
        <ScreenshotFrame
          src={dashboardScreenshot}
          label="Dashboard"
          caption="Current and past events, together in your dashboard."
        />
      </section>

      <section
        className="landing-guide"
        id="how-it-works"
        aria-labelledby="how-heading"
      >
        <div className="landing-container">
          <h2 id="how-heading">How it works</h2>
          <ol className="landing-guide-steps">
            <li>
              <span className="landing-step-number">1</span>
              <h3>Browse events</h3>
              <p>Explore as a guest and find something you’re interested in.</p>
            </li>
            <li>
              <span className="landing-step-number">2</span>
              <h3>Create an account</h3>
              <p>
                Sign up as a participant to join events, or as an organizer to
                host them.
              </p>
            </li>
            <li>
              <span className="landing-step-number">3</span>
              <h3>Join and take part</h3>
              <p>
                Reserve a place, add comments, and keep track of your events.
                Log in to access the community.
              </p>
            </li>
          </ol>
        </div>
      </section>

      <section
        className="landing-showcase landing-container landing-organizer"
        aria-labelledby="organize-heading"
      >
        <div className="landing-section-heading">
          <h2 id="organize-heading">Hosting an event?</h2>
          <p>
            Add the details, choose a date and location, and upload a cover.
            Preview the expanded event card before you confirm and publish.
          </p>
        </div>
        <ScreenshotFrame
          src={eventPreviewScreenshot}
          label="Event preview"
          caption="Review exactly what people will see before your event goes live."
        />
        <div className="landing-organizer-action">
          <p>Manage your events and participants from your dashboard.</p>
          {isAuthenticated ? (
            <Link className="landing-button" to="/Dashboard">
              Open dashboard <ArrowRight size={17} />
            </Link>
          ) : (
            <button
              className="landing-button"
              onClick={() => openAuth("register")}
            >
              Sign up to get started <ArrowRight size={17} />
            </button>
          )}
        </div>
      </section>
      <footer className="landing-footer">
        <span>UniEventia</span>
        <span>Demo app for demonstration purposes only.</span>
      </footer>
    </main>
  );
}
