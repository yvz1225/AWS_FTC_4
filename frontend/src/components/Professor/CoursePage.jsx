import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, AlertTriangle, TrendingUp } from 'lucide-react';
import './professor.css';

// 데모 데이터 (추후 API 연동)
const DEMO_TEAMS = {
  c1: {
    course_name: '캡스톤디자인',
    semester: '2026-1학기',
    teams: [
      { team_id: 't1', team_name: 'Team-Up Sentinel', member_count: 4, avg_activity: 61, warning_count: 1 },
      { team_id: 't2', team_name: 'EcoTracker', member_count: 3, avg_activity: 78, warning_count: 0 },
      { team_id: 't3', team_name: 'StudyMate', member_count: 5, avg_activity: 45, warning_count: 2 },
      { team_id: 't4', team_name: 'HealthBot', member_count: 4, avg_activity: 82, warning_count: 0 },
      { team_id: 't5', team_name: 'CodeReview AI', member_count: 3, avg_activity: 55, warning_count: 1 },
    ],
  },
  c2: {
    course_name: 'SW공학',
    semester: '2026-1학기',
    teams: [
      { team_id: 't6', team_name: 'BugHunter', member_count: 4, avg_activity: 70, warning_count: 0 },
      { team_id: 't7', team_name: 'DevFlow', member_count: 3, avg_activity: 52, warning_count: 1 },
      { team_id: 't8', team_name: 'TestPilot', member_count: 5, avg_activity: 65, warning_count: 0 },
    ],
  },
};

function getStatusColor(avg) {
  if (avg >= 70) return '#2d6a4f';
  if (avg >= 50) return '#e09f3e';
  return '#c1121f';
}

export default function CoursePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const data = DEMO_TEAMS[courseId] || { course_name: '수업', semester: '', teams: [] };

  return (
    <div className="prof-page">
      <div className="prof-header">
        <div className="prof-header-left">
          <button className="prof-btn-back" onClick={() => navigate('/professor')}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1>{data.course_name}</h1>
            <span className="prof-semester">{data.semester}</span>
          </div>
        </div>
      </div>

      <div className="team-list">
        {data.teams.map((team, i) => (
          <motion.div
            key={team.team_id}
            className="team-row"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => navigate(`/professor/team/${team.team_id}`)}
          >
            <div className="team-row-name">
              <strong>{team.team_name}</strong>
            </div>
            <div className="team-row-stats">
              <span className="team-stat">
                <Users size={14} /> {team.member_count}명
              </span>
              <span className="team-stat">
                <TrendingUp size={14} style={{ color: getStatusColor(team.avg_activity) }} />
                <span style={{ color: getStatusColor(team.avg_activity), fontWeight: 600 }}>
                  평균 {team.avg_activity}%
                </span>
              </span>
              {team.warning_count > 0 && (
                <span className="team-stat team-warning">
                  <AlertTriangle size={14} /> 경고 {team.warning_count}명
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
