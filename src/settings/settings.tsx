import React from "react";
import { createRoot } from "react-dom/client";
import "./settings.css";
import { SettingsApp } from "./SettingsApp";

const container = document.getElementById("root");
if (!container) throw new Error("Settings root element not found");

createRoot(container).render(
  <React.StrictMode>
    <SettingsApp />
  </React.StrictMode>
);