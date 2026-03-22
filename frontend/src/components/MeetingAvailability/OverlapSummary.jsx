import React from "react";
import { DAYS, HOURS, formatHour, calcOverlapCount, calcRecommendations } from "./availabilityUtils";

function OverlapGrid({ overlapCount }) {
  return (
    <div className="ma-grid-wrap">
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
                const count = overlapCount[dayIdx][hour];
                return (
                  <td
                    key={dayIdx}
                    className={`ma-cell overlap-${count}`}
                    title={`${count}명 가능`}
                  >
                    {count > 0 && <span className="ma-cell-count">{count}</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecommendCard({ rec, rank }) {
  const duration = rec.end - rec.start;
  return (
    <div className="ma-rec-card">
      <div className="ma-rec-rank">{rank + 1}</div>
      <div className="ma-rec-info">
        <span className="ma-rec-day">{DAYS[rec.day]}요일</span>
        <span className="ma-rec-time">{formatHour(rec.start)} – {formatHour(rec.end)}</span>
        <span className="ma-rec-meta">{rec.minCount}명 · {duration}시간</span>
      </div>
    </div>
  );
}

export default function OverlapSummary({ availability }) {
  const overlapCount = calcOverlapCount(availability);
  const recommendations = calcRecommendations(overlapCount);

  return (
    <div className="ma-overlap-layout">
      <div className="ma-overlap-grid-col">
        <div className="ma-section-title">전체 겹치는 시간</div>
        <OverlapGrid overlapCount={overlapCount} />
      </div>

      <div className="ma-overlap-rec-col">
        <div className="ma-section-title">추천 회의 시간대</div>
        {recommendations.length === 0 ? (
          <p className="ma-empty">겹치는 시간대가 없습니다.</p>
        ) : (
          <div className="ma-rec-list">
            {recommendations.map((rec, i) => (
              <RecommendCard key={i} rec={rec} rank={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
