import React from "react";
import AppShell from "./Layouts/appShell.comp";
import Events from "./tabs/events.comp";
import OrganizerLayout from "./Layouts/organizerLayout.comp.jsx";
import ParticipantLayout from "./Layouts/participantLayout.comp.jsx";
import { useAuth } from "../authContext";

export default function Dashboard() {
  const { user: storedUser, isAuthenticated } = useAuth();

  if (isAuthenticated && storedUser?.role === "Organizer") {
    return <OrganizerLayout />;
  }

  if (isAuthenticated && storedUser?.role === "Participant") {
    return <ParticipantLayout />;
  }

  return <AppShell role="Guest" renderPage={(page) => <Events key={page} view={page === "Past Events" ? "past" : "upcoming"} />} />;
}
