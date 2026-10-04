import React, { useEffect, useState } from "react";
import {
  Bell,
  CalendarDays,
  CalendarCheck2,
  ChevronRight,
  CircleUserRound,
  FilePlus2,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeft,
  ShieldCheck,
  LockKeyhole,
  Users,
  X,
} from "lucide-react";
import { ConfigProvider } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../authContext";
import { Avatar, Button, Card, Separator } from "../ui/primitives";
import { getMediaUrl, API_URL } from "../../api";
import "../../Styles/Shell.styles.css";

const organizerNavigation = [
  { key: "Events", label: "Discover", icon: LayoutDashboard },
  { key: "Upload Event", label: "Create event", icon: FilePlus2 },
  { key: "Manage Events", label: "Manage events", icon: CalendarDays },
  { key: "Past Events", label: "Past events", icon: CalendarDays },
  { key: "Users", label: "Community", icon: Users },
  { key: "Notifications", label: "Notifications", icon: Bell },
];

const participantNavigation = [
  { key: "Events", label: "Discover", icon: LayoutDashboard },
  { key: "My Events", label: "My events", icon: CalendarCheck2 },
  { key: "Past Events", label: "Past events", icon: CalendarDays },
  { key: "Users", label: "Community", icon: Users },
  { key: "Notifications", label: "Notifications", icon: Bell },
];

export default function AppShell({ role, renderPage }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const compactSidebar = collapsed && !mobileMenuOpen;
  const [currentPage, setCurrentPage] = useState(
    () => localStorage.getItem("activePage") || "Events",
  );
  const [showLogout, setShowLogout] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const { user, isAuthenticated, requireAuth, logout: endSession } = useAuth();
  const isGuest = !isAuthenticated;
  const visiblePage = isGuest && !["Events", "Past Events"].includes(currentPage) ? "Events" : currentPage;
  const navigate = useNavigate();
  const activeRole = isGuest ? "Guest" : user?.role || role;
  const isOrganizer = activeRole === "Organizer";
  const navigation = isOrganizer ? organizerNavigation : participantNavigation;

  useEffect(() => {
    const availablePages = new Set([
      ...navigation.map((item) => item.key),
      "Profile",
    ]);

    if (!availablePages.has(currentPage)) {
      setCurrentPage("Events");
      localStorage.setItem("activePage", "Events");
    }
  }, [currentPage, navigation]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || isGuest) return;

    const fetchUnreadNotifications = async () => {
      try {
        const response = await fetch(`${API_URL}/notifications/unread-count`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const data = await response.json();
        setUnreadNotifications(Number(data?.unread || 0));
      } catch (error) {
        console.error("Failed to fetch unread notification count:", error);
      }
    };

    fetchUnreadNotifications();
  }, [currentPage, isGuest]);

  const displayName = user
    ? `${user.fname || ""} ${user.lname || ""}`.trim()
    : "Guest";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const logout = () => {
    endSession();
    navigate("/", { replace: true });
  };

  const selectPage = (page) => {
    if (!["Events", "Past Events"].includes(page) && !requireAuth(page === "Users" ? "view the community" : `access ${page.toLowerCase()}`)) {
      setMobileMenuOpen(false);
      return;
    }
    setCurrentPage(page);
    localStorage.setItem("activePage", page);
    setMobileMenuOpen(false);
  };

  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#30665e", colorText: "#262c32", colorBgContainer: "#ffffff", colorBorder: "#dfe3e6", borderRadius: 6, fontFamily: '"Avenir Next", sans-serif' } }}>
    <div className="app-shell">
      <aside
        className={`app-sidebar ${collapsed ? "is-collapsed" : ""} ${
          mobileMenuOpen ? "is-mobile-open" : ""
        }`}
      >
        <Link to="/" className="sidebar-brand" aria-label="UniEventia home">
          <span className="brand-mark">
            <CalendarDays size={20} />
          </span>
          {!compactSidebar && (
            <span>
              <strong>Uni</strong>Eventia
            </span>
          )}
        </Link>
        <div className="sidebar-section-label">Workspace</div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {navigation.map(({ key, label, icon: Icon }) => (
            <button
              className={`sidebar-link ${visiblePage === key ? "is-active" : ""}`}
              key={key}
              onClick={() => selectPage(key)}
              aria-label={label}
              aria-current={visiblePage === key ? "page" : undefined}
              title={collapsed ? label : undefined}
            >
              <Icon size={19} />
              {!compactSidebar && <span>{label}</span>}
              {!compactSidebar && isGuest && !["Events", "Past Events"].includes(key) && <LockKeyhole className="nav-lock" size={12} aria-hidden="true" />}
              {!compactSidebar &&
                key === "Notifications" &&
                unreadNotifications > 0 && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Separator />
          <button
            className={`sidebar-link ${visiblePage === "Profile" ? "is-active" : ""}`}
            onClick={() => selectPage("Profile")}
            aria-label="Profile"
            title={collapsed ? "Profile" : undefined}
          >
            <CircleUserRound size={19} />
            {!compactSidebar && <span>Profile</span>}
          </button>
          <button
            className="sidebar-link sidebar-logout"
            onClick={() => isGuest ? requireAuth("join UniEventia") : setShowLogout(true)}
            title={collapsed ? (isGuest ? "Log in / Register" : "Log out") : undefined}
          >
            <LogOut size={19} />
            {!compactSidebar && <span>{isGuest ? "Log in / Register" : "Log out"}</span>}
          </button>
        </div>
      </aside>

      <main className={`app-main ${collapsed ? "sidebar-collapsed" : ""}`}>
        <header className="app-header">
          <div className="header-leading">
            <Button
              variant="ghost"
              size="icon"
              className="navigation-toggle"
              onClick={() => {
                if (window.innerWidth <= 760) {
                  setMobileMenuOpen((value) => !value);
                } else {
                  setCollapsed((value) => !value);
                }
              }}
              aria-expanded={mobileMenuOpen || !collapsed}
              aria-label="Toggle navigation"
            >
              <span className="desktop-navigation-icon">
                <PanelLeft size={20} />
              </span>
              <span className="mobile-navigation-icon">
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </span>
            </Button>
            <div className="breadcrumb">
              <span>Workspace</span>
              <ChevronRight size={14} />
              <strong>
                {visiblePage === "Events" ? "Discover" : visiblePage}
              </strong>
            </div>
          </div>
          <div className="header-actions">
            <div
              className="header-user"
              role="button"
              tabIndex={0}
              onClick={() => selectPage("Profile")}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  selectPage("Profile");
                }
              }}
              style={{ cursor: "pointer" }}
            >
              <Avatar
                src={getMediaUrl(user?.profilePicture, "profile")}
                fallback={initials || "M"}
              />
              <div className="header-user-copy">
                <strong>{displayName || "Member"}</strong>
                <span>{activeRole}</span>
              </div>
            </div>
          </div>
        </header>
        <section className="workspace-content">
          <div className="content-intro">
            <div>
              <p className="eyebrow">
                <ShieldCheck size={14} />
                {isGuest ? "Explore as a guest" : isOrganizer ? "Organizer workspace" : "Participant workspace"}
              </p>
              <h1>{visiblePage === "Events" ? "Find your next gathering" : visiblePage}</h1>
            </div>
          </div>
          <Card className="page-panel">{renderPage(visiblePage)}</Card>
        </section>
        <footer className="app-footer">
          <span>Demo app for demonstration purposes only.</span>
          <span>•</span>
          <a
            href="https://github.com/Fziyen/UniEventia-Front-End"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </footer>
      </main>

      {mobileMenuOpen && (
        <button
          className="mobile-menu-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {showLogout && (
        <div
          className="dialog-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setShowLogout(false)
          }
        >
          <div
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
          >
            <button
              className="dialog-close"
              onClick={() => setShowLogout(false)}
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <div className="dialog-icon">
              <LogOut size={20} />
            </div>
            <h2 id="logout-title">Leave your workspace?</h2>
            <p>Your session will end on this device.</p>
            <div className="dialog-actions">
              <Button variant="outline" onClick={() => setShowLogout(false)}>
                Stay here
              </Button>
              <Button variant="destructive" onClick={logout}>
                Log out
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ConfigProvider>
  );
}
