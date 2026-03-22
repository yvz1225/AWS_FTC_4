import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Plus, Users } from 'lucide-react';
import './professor.css';

// 데모 데이터 (추후 API 연동)
const DEMO_COURSES = [
  { course_id: 'c1', name: '캡스톤디자인', semester: '2026-1학기', team_count: 5 },
  { course_id: 'c2', name: 'SW공학', semester: '2026-1학기', team_count: 3 },
];

export default function ProfessorDashboard() {
  const [courses, setCourses] = useState(DEMO_COURSES);
  const [showAdd, setShowAdd] = useState(false);
  const [newCourse, setNewCourse] = useState({ name: '', semester: '' });
  const navigate = useNavigate();

  function handleAddCourse() {
    if (!newCourse.name || !newCourse.semester) return;
    const course = {
      course_id: `c${Date.now()}`,
      name: newCourse.name,
      semester: newCourse.semester,
      team_count: 0,
    };
    setCourses((prev) => [...prev, course]);
    setNewCourse({ name: '', semester: '' });
    setShowAdd(false);
    // TODO: POST /professor/{id}/courses API 호출
  }

  return (
    <div className="prof-page">
      <div className="prof-header">
        <h1><BookOpen size={24} /> 교수 대시보드</h1>
        <button className="prof-btn-primary" onClick={() => setShowAdd(!showAdd)}>
          <Plus size={16} /> 수업 추가
        </button>
      </div>

      {showAdd && (
        <motion.div
          className="prof-add-form"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <input
            placeholder="수업명 (예: 캡스톤디자인)"
            value={newCourse.name}
            onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
          />
          <input
            placeholder="학기 (예: 2026-1학기)"
            value={newCourse.semester}
            onChange={(e) => setNewCourse({ ...newCourse, semester: e.target.value })}
          />
          <button className="prof-btn-primary" onClick={handleAddCourse}>생성</button>
        </motion.div>
      )}

      <div className="prof-grid">
        {courses.map((c) => (
          <motion.div
            key={c.course_id}
            className="prof-card"
            whileHover={{ scale: 1.02 }}
            onClick={() => navigate(`/professor/course/${c.course_id}`)}
          >
            <h3>{c.name}</h3>
            <span className="prof-semester">{c.semester}</span>
            <div className="prof-card-footer">
              <Users size={14} />
              <span>{c.team_count}개 팀</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
