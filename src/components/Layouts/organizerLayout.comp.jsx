import React from "react";
import { Navigate } from "react-router-dom";
import AppShell from "./appShell.comp";
import Events from "../tabs/events.comp";
import UploadEvent from "../tabs/uploadEvent.comp";
import Users from "../tabs/users.comp";
import Profile from "../tabs/profile.comp";
import Notifications from "../tabs/notifications.comp";
import ManageEvents from "../tabs/manageEvents.comp";
import PastEvents from "../tabs/pastEvents.comp";

export default function OrganizerLayout() {
  let storedUser = null;

  try {
    storedUser = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    storedUser = null;
  }

  if (!storedUser || storedUser.role !== "Organizer") {
    return <Navigate to="/participant-layout" replace />;
  }

  return (
    <AppShell
      role="Organizer"
      renderPage={(page) => {
        switch (page) {
          case "Upload Event":
            return <UploadEvent />;
          case "Manage Events":
            return <ManageEvents />;
          case "Past Events":
            return <PastEvents />;
          case "Users":
            return <Users />;
          case "Notifications":
            return <Notifications />;
          case "Profile":
            return <Profile />;
          default:
            return <Events />;
        }
      }}
    />
  );
}
