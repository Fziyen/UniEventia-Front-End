import React from "react";
import { Navigate } from "react-router-dom";
import OrganizerLayout from "./Layouts/organizerLayout.comp.jsx";
import ParticipantLayout from "./Layouts/participantLayout.comp.jsx";
import { useAuth } from "../authContext";

export default function Dashboard() {
  const { user: storedUser } = useAuth();

  if (storedUser?.role === "Organizer") {
    return <OrganizerLayout />;
  }

  if (storedUser?.role === "Participant") {
    return <ParticipantLayout />;
  }

  return <Navigate to="/login" replace />;
}
