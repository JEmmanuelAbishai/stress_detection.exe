import React from "react";
import { createRoot } from "react-dom/client";
import "./dashboard.css";
import { DashboardApp } from "./DashboardApp";

const container = document.getElementById("root");
if (!container) throw new Error("Dashboard root element not found");

createRoot(container).render(
  <React.StrictMode>
    <DashboardApp />
  </React.StrictMode>
);
