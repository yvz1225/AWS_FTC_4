import React, { useRef, useCallback } from "react";
import { DAYS, HOURS, formatHour } from "./availabilityUtils";

export default function AvailabilityGrid({ availability, activeMember, setCell }) {
  const dragState = useRef(null); // { painting: true/false }

  const handleMouseDown = useCallback(
    (day, hour) => {
      const current = availability[activeMember][day][hour];
      dragState.current = { painting: !current };
      setCell(activeMember, day, hour, !current);
    },
    [availability, activeMember, setCell]
  );

  const handleMouseEnter = useCallback(
    (day, hour) => {
      if (dragState.current === null) return;
      setCell(activeMember, day, hour, dragState.current.painting);
    },
    [activeMember, setCell]
  );

  const handleMouseUp = useCallback(() => {
    dragState.current = null;
  }, []);

  return (
    <div
      className="ma-grid-wrap"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <table className="ma-grid" onDragStart={(e) => e.preventDefault()}>
        <thead>
          <tr>
            <th className="ma-th-time" />
            {DAYS.map((d) => (
              <th key={d} className="ma-th-day">{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {HOURS.map((hour) => (
            <tr key={hour}>
              <td className="ma-td-time">{formatHour(hour)}</td>
              {DAYS.map((_, dayIdx) => {
                const selected = availability[activeMember][dayIdx][hour];
                return (
                  <td
                    key={dayIdx}
                    className={`ma-cell${selected ? " selected" : ""}`}
                    onMouseDown={() => handleMouseDown(dayIdx, hour)}
                    onMouseEnter={() => handleMouseEnter(dayIdx, hour)}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
