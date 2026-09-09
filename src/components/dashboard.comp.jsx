import React from "react";
import { Navigate } from "react-router-dom";
import OrganizerLayout from "./Layouts/organizerLayout.comp.jsx";
import ParticipantLayout from "./Layouts/participantLayout.comp.jsx";

export default function Dashboard() {
  let storedUser = null;

  try {
    storedUser = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    storedUser = null;
  }

  if (storedUser?.role === "Organizer") {
    return <OrganizerLayout />;
  }

  if (storedUser?.role === "Participant") {
    return <ParticipantLayout />;
  }

  return <Navigate to="/login" replace />;
}
