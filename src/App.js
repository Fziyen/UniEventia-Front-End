import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./components/auth/login.comp.jsx";
import Signup from "./components/auth/signup.comp.jsx";
import Dashboard from "./components/dashboard.comp.jsx";
import ProtectedRoute from "./components/protectedRoute.comp.jsx";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/register" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/Dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
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
  );
}

export default App;
