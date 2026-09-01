import React from "react";
import { Navigate } from "react-router-dom";
import AppShell from "./appShell.comp";
import Events from "../tabs/events.comp";
import MyEvents from "../tabs/myEvents.comp";
import PastEvents from "../tabs/pastEvents.comp";
import Users from "../tabs/users.comp";
import Notifications from "../tabs/notifications.comp";
import Profile from "../tabs/profile.comp";

export default function ParticipantLayout() {
  let storedUser = null;

  try {
    storedUser = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    storedUser = null;
  }

  if (!storedUser || storedUser.role !== "Participant") {
    return <Navigate to="/organizer-layout" replace />;
  }

  return (
    <AppShell
      role="Participant"
      renderPage={(page) => {
        switch (page) {
          case "My Events":
            return <MyEvents />;
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
