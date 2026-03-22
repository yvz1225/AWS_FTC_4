import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import MeetingAvailability from "./components/MeetingAvailability/MeetingAvailability";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <App />
    <div style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 20px 40px" }}>
      <MeetingAvailability />
    </div>
  </React.StrictMode>
);