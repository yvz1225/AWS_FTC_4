import React from "react";
import { MEMBERS } from "./availabilityUtils";

export default function MemberTabs({ activeMember, onSelect }) {
  return (
    <div className="ma-tabs">
      {MEMBERS.map(({ id, name }) => (
        <button
          key={id}
          className={`ma-tab-btn${activeMember === id ? " active" : ""}`}
          onClick={() => onSelect(id)}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
