import React from "react";
import { Route, Routes } from "react-router-dom";
import AuthModal from "./components/auth/authModal.comp";
import Dashboard from "./components/dashboard.comp.jsx";
import ProtectedRoute from "./components/protectedRoute.comp.jsx";

import Landing from "./components/landing.comp";

function App() {
  return (
    <>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/register" element={<Landing />} />
      <Route path="/login" element={<Landing />} />
      <Route
        path="/Dashboard"
        element={
          <Dashboard />
        }
      />
      <Route
        path="/organizer-layout"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/participant-layout"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
    <AuthModal />
    </>
  );
}

export default App;
