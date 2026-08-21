import React from "react";
import { createRoot } from "react-dom/client";
import "./popup.css";
import { PopupApp } from "./PopupApp";

const container = document.getElementById("root");
if (!container) throw new Error("Popup root element not found");

createRoot(container).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>
);