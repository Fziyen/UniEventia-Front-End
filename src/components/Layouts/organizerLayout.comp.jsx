import React from "react";
import Administration from "../tabs/administration.comp";
import MyEvents from "../tabs/myEvents.comp";
import { useAuth } from "../../authContext";
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
  const { user: storedUser } = useAuth();
  if (!storedUser || !["Organizer", "Administrator"].includes(storedUser.role)) {
    return <Navigate to="/Dashboard" replace />;
  }

  return (
    <AppShell
      role={storedUser.role}
      renderPage={(page) => {
        switch (page) {
          case "Administration":
            return storedUser.role === "Administrator" ? <Administration /> : <Events />;
          case "My Events":
            return <MyEvents />;
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
