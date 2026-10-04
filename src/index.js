import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./authContext";
import "./index.css";
import axios from "axios";
import { API_URL } from "./api";
import { installSessionInterceptor } from "./session";

installSessionInterceptor(axios, API_URL);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <Router>
    <AuthProvider>
      <App />
    </AuthProvider>
  </Router>,
);
