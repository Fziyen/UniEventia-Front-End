import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./components/auth/login.comp.jsx";
import Signup from "./components/auth/signup.comp.jsx";
import OrganizerLayout from "./components/Layouts/organizerLayout.comp.jsx";
import ParticipantLayout from "./components/Layouts/participantLayout.comp.jsx";
import ProtectedRoute from "./components/protectedRoute.comp.jsx";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/register" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/organizer-layout"
        element={
          <ProtectedRoute>
            <OrganizerLayout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/participant-layout"
        element={
          <ProtectedRoute>
            <ParticipantLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
