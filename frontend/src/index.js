import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));

// REACT_APP_MODE=professor 로 실행하면 교수님 페이지
const mode = process.env.REACT_APP_MODE;

if (mode === "professor") {
  const ProfessorApp = require("./ProfessorApp").default;
  root.render(
    <React.StrictMode>
      <ProfessorApp />
    </React.StrictMode>
  );
} else {
  const App = require("./App").default;
  const MeetingAvailability = require("./components/MeetingAvailability/MeetingAvailability").default;
  root.render(
    <React.StrictMode>
      <App />
      <div style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 20px 40px" }}>
        <MeetingAvailability />
      </div>
    </React.StrictMode>
  );
}
