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
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  const [currentPage, setCurrentPage] = useState("Events");
  const [showLogout, setShowLogout] = useState(false);
  const [user, setUser] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const navigate = useNavigate();
  const activeRole = user?.role || role;
  const isOrganizer = activeRole === "Organizer";
  const navigation = isOrganizer ? organizerNavigation : participantNavigation;

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (!token || !storedUser) {
      navigate("/login", { replace: true });
      return;
    }
    try {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);

      const expectedPath =
        parsedUser?.role === "Organizer"
          ? "/organizer-layout"
          : "/participant-layout";

      if (window.location.pathname !== expectedPath) {
        navigate(expectedPath, { replace: true });
      }
    } catch (error) {
      localStorage.removeItem("user");
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

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
  }, [currentPage]);

  const displayName = user
    ? `${user.fname || ""} ${user.lname || ""}`.trim()
    : "Member";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className={`app-sidebar ${collapsed ? "is-collapsed" : ""}`}>
        <div className="sidebar-brand">
          <span className="brand-mark">
            <CalendarDays size={20} />
          </span>
          {!collapsed && (
            <span>
              <strong>Uni</strong>Eventia
            </span>
          )}
        </div>
        <div className="sidebar-section-label">Workspace</div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {navigation.map(({ key, label, icon: Icon }) => (
            <button
              className={`sidebar-link ${currentPage === key ? "is-active" : ""}`}
              key={key}
              onClick={() => setCurrentPage(key)}
              title={collapsed ? label : undefined}
            >
              <Icon size={19} />
              {!collapsed && <span>{label}</span>}
              {!collapsed &&
                key === "Notifications" &&
                unreadNotifications > 0 && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        {!collapsed && (
          <div className="sidebar-context">
            <span className="sidebar-context-icon">
              <ShieldCheck size={15} />
            </span>
            <div>
              <strong>
                {isOrganizer ? "Organizer mode" : "Participant mode"}
              </strong>
              <span>
                {isOrganizer
                  ? "Shape the next gathering"
                  : "Stay close to your community"}
              </span>
            </div>
          </div>
        )}
        <div className="sidebar-bottom">
          <Separator />
          <button
            className={`sidebar-link ${currentPage === "Profile" ? "is-active" : ""}`}
            onClick={() => setCurrentPage("Profile")}
            title={collapsed ? "Profile" : undefined}
          >
            <CircleUserRound size={19} />
            {!collapsed && <span>Profile</span>}
          </button>
          <button
            className="sidebar-link sidebar-logout"
            onClick={() => setShowLogout(true)}
            title={collapsed ? "Log out" : undefined}
          >
            <LogOut size={19} />
            {!collapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>

      <main className={`app-main ${collapsed ? "sidebar-collapsed" : ""}`}>
        <header className="app-header">
          <div className="header-leading">
            <Button
              variant="ghost"
              size="icon"
              className="mobile-menu-button"
              onClick={() => setCollapsed((value) => !value)}
              aria-label="Toggle navigation"
            >
              <Menu size={20} />
            </Button>
            <div className="breadcrumb">
              <span>Workspace</span>
              <ChevronRight size={14} />
              <strong>
                {currentPage === "Events" ? "Discover" : currentPage}
              </strong>
            </div>
          </div>
          <div className="header-actions">
            <Button
              variant="ghost"
              size="icon"
              className="desktop-collapse"
              onClick={() => setCollapsed((value) => !value)}
              aria-label="Collapse sidebar"
            >
              <PanelLeft size={18} />
            </Button>
            <div className="header-user">
              <Avatar
                src={getMediaUrl(user?.profilePicture, "profile")}
                fallback={initials || "M"}
              />
              <div className="header-user-copy">
                <strong>{displayName || "Member"}</strong>
                <span>{role}</span>
              </div>
            </div>
          </div>
        </header>
        <section className="workspace-content">
          <div className="content-intro">
            <div>
              <p className="eyebrow">
                <ShieldCheck size={14} />{" "}
                {isOrganizer ? "Organizer workspace" : "Participant workspace"}
              </p>
              <h1>
                {currentPage === "Events"
                  ? "Find your next gathering"
                  : currentPage}
              </h1>
            </div>
            <div className="content-accent">
              <Search size={18} />
              <span>
                {isOrganizer
                  ? "Your events, one view"
                  : "Your community, one view"}
              </span>
            </div>
          </div>
          <Card className="page-panel">{renderPage(currentPage)}</Card>
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
  );
}
