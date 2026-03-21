import React, { useState, useEffect } from 'react';

export default function Dashboard({ setupComplete, dashboardUrl }) {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (setupComplete) {
      setLogs([
        { name: '김유진', role: 'Frontend', score: 95, status: 'NORMAL' },
        { name: '이민수', role: 'Backend', score: 0, status: 'WARNING_YELLOW_CARD' }
      ]);
    }
  }, [setupComplete]);

  if (!setupComplete) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        <p>프로젝트 기획을 완료하면 대시보드가 활성화됩니다.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '1rem', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#4ade80' }}>✅ 인프라 구축 완료</h3>
        <p style={{ margin: '0 0 1rem 0', color: 'var(--text-main)', fontSize: '0.9rem' }}>
          매니저 에이전트의 스펙에 따라 워크스페이스가 생성되었습니다.
        </p>
        <a href={dashboardUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', padding: '0.6rem 1rem', borderRadius: '6px', color: '#fff', textDecoration: 'none', fontSize: '0.9rem', border: '1px solid var(--border)' }}>
          Notion 메인 대시보드 열기 ↗
        </a>
      </div>

      <div>
        <h3>팀원 실시간 기여도 로그</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>1시간 주기로 GitHub 및 Notion 활동을 트래킹합니다.</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {logs.map((log, i) => (
            <div key={i} style={{
              background: 'rgba(0,0,0,0.2)',
              border: `1px solid ${log.status === 'WARNING_YELLOW_CARD' ? '#ef4444' : 'var(--border)'}`,
              padding: '1rem',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <strong style={{ display: 'block', fontSize: '1.1rem' }}>{log.name} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>({log.role})</span></strong>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Score: {log.score}</span>
              </div>
              
              {log.status === 'WARNING_YELLOW_CARD' ? (
                <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  🚨 무임승차 경고 (메일 발송됨)
                </div>
              ) : (
                <div style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                  정상 기여 중
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
