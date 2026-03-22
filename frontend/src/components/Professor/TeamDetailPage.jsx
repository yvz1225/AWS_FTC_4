import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import './professor.css';

// 데모 데이터 (추후 GET /teams/{team_id}/summary API 연동)
const DEMO_TEAM_DETAIL = {
  t1: {
    team_name: 'Team-Up Sentinel',
    repo_url: 'https://github.com/yvz1225/AWS_FTC_4',
    notion_page_url: 'https://notion.so/example',
    overall_progress: 45,
    members: [
      { name: '유진', role: '프론트엔드', github_id: 'yujin123', email: 'yujin@example.com', activity_estimate: 72, activity_status: '정상' },
      { name: '나연', role: '프론트엔드', github_id: 'nayeon456', email: 'nayeon@example.com', activity_estimate: 38, activity_status: '낮음' },
      { name: '민수', role: '백엔드', github_id: 'minsu789', email: 'minsu@example.com', activity_estimate: 55, activity_status: '주의' },
      { name: '지호', role: '백엔드', github_id: 'jiho012', email: 'jiho@example.com', activity_estimate: 80, activity_status: '정상' },
    ],
  },
};

const STATUS_COLORS = { '정상': '#2d6a4f', '주의': '#e09f3e', '낮음': '#c1121f' };

function DonutChart({ percent, status }) {
  const size = 80;
  const sw = 8;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  const color = STATUS_COLORS[status] || '#999';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e8e8e8" strokeWidth={sw} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        fontSize="16" fontWeight="700" fill="#333">{percent}%</text>
    </svg>
  );
}

export default function TeamDetailPage() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const team = DEMO_TEAM_DETAIL[teamId] || DEMO_TEAM_DETAIL['t1'];

  return (
    <div className="prof-page">
      <div className="prof-header">
        <div className="prof-header-left">
          <button className="prof-btn-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
          </button>
          <h1>{team.team_name}</h1>
        </div>
        <div className="prof-header-links">
          {team.repo_url && (
            <a href={team.repo_url} target="_blank" rel="noreferrer" className="prof-link">
              GitHub <ExternalLink size={12} />
            </a>
          )}
          {team.notion_page_url && (
            <a href={team.notion_page_url} target="_blank" rel="noreferrer" className="prof-link">
              Notion <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>

      <div className="detail-progress">
        <h3>전체 진행률</h3>
        <div className="detail-progress-track">
          <div className="detail-progress-fill" style={{ width: `${team.overall_progress}%` }} />
        </div>
        <span className="detail-progress-label">{team.overall_progress}%</span>
      </div>

      <h3 style={{ margin: '20px 0 12px' }}>팀원 활동</h3>
      <div className="detail-members">
        {team.members.map((m) => (
          <div key={m.github_id} className="detail-member-card">
            <div className="detail-member-avatar" style={{ background: STATUS_COLORS[m.activity_status] }}>
              {m.name.charAt(0)}
            </div>
            <div className="detail-member-info">
              <strong>{m.name}</strong>
              <span className="detail-role">{m.role}</span>
              <span className="detail-email">{m.email}</span>
              <span className="detail-github">@{m.github_id}</span>
            </div>
            <DonutChart percent={m.activity_estimate} status={m.activity_status} />
            <span className="detail-status" style={{ background: STATUS_COLORS[m.activity_status] }}>
              {m.activity_status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
