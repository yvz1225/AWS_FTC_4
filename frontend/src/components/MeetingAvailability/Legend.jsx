import React from "react";
import { MEMBERS } from "./availabilityUtils";

const TOTAL = MEMBERS.length;

export default function Legend() {
  return (
    <div className="ma-legend">
      <span className="ma-legend-label">겹치는 인원:</span>
      {Array.from({ length: TOTAL + 1 }, (_, i) => (
        <div key={i} className="ma-legend-item">
          <span className={`ma-legend-swatch overlap-${i}`} />
          <span>{i}명</span>
        </div>
      ))}
    </div>
  );
}
