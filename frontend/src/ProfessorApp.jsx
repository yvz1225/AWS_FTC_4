import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProfessorDashboard from './components/Professor/ProfessorDashboard';
import CoursePage from './components/Professor/CoursePage';
import TeamDetailPage from './components/Professor/TeamDetailPage';
import './index.css';

export default function ProfessorApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/professor" element={<ProfessorDashboard />} />
        <Route path="/professor/course/:courseId" element={<CoursePage />} />
        <Route path="/professor/team/:teamId" element={<TeamDetailPage />} />
        <Route path="*" element={<Navigate to="/professor" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
