import React, { useState } from "react";
import "./meetingAvailability.css";
import { useAvailability } from "./useAvailability";
import MemberTabs from "./MemberTabs";
import AvailabilityGrid from "./AvailabilityGrid";
import OverlapSummary from "./OverlapSummary";
import Legend from "./Legend";

export default function MeetingAvailability() {
  const { availability, activeMember, setActiveMember, setCell } = useAvailability();
  const [view, setView] = useState("edit"); // "edit" | "overlap"

  return (
    <div className="ma-root">
      <div className="ma-header">
        <div>
          <h2 className="ma-title">회의 가능 시간 조율</h2>
          <p className="ma-subtitle">팀원별 가능한 시간을 선택하고 겹치는 구간을 확인하세요.</p>
        </div>
        <div className="ma-view-toggle">
          <button
            className={`ma-toggle-btn${view === "edit" ? " active" : ""}`}
            onClick={() => setView("edit")}
          >
            내 시간 입력
          </button>
          <button
            className={`ma-toggle-btn${view === "overlap" ? " active" : ""}`}
            onClick={() => setView("overlap")}
          >
            겹치는 시간 보기
          </button>
        </div>
      </div>

      {view === "edit" ? (
        <div className="ma-edit-section">
          <MemberTabs activeMember={activeMember} onSelect={setActiveMember} />
          <p className="ma-hint">셀을 클릭하거나 드래그해서 가능한 시간을 선택하세요.</p>
          <AvailabilityGrid
            availability={availability}
            activeMember={activeMember}
            setCell={setCell}
          />
          <Legend />
        </div>
      ) : (
        <OverlapSummary availability={availability} />
      )}
    </div>
  );
}
