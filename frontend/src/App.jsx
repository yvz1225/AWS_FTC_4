import React, { useState } from 'react';
import TeamSetupChat from './components/TeamSetupChat';
import Dashboard from './components/Dashboard';

function App() {
  const [setupComplete, setSetupComplete] = useState(false);
  const [dashboardUrl, setDashboardUrl] = useState('');

  return (
    <div className="app-container">
      <header style={{ gridColumn: '1 / -1', textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ 
            fontSize: '3rem', margin: 0, fontWeight: 800, 
            background: 'linear-gradient(to right, #60a5fa, #a78bfa)', 
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' 
        }}>
          Team-Up Sentinel
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>AI-Powered Collaboration & Free-Rider Detection</p>
      </header>

      <div className="glass-panel" style={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ marginTop: 0 }}>Manager Agent Chat</h2>
        <TeamSetupChat onSetupComplete={(url) => {
          setSetupComplete(true);
          setDashboardUrl(url);
        }} />
      </div>

      <div className="glass-panel" style={{ height: '70vh', overflowY: 'auto' }}>
        <h2 style={{ marginTop: 0 }}>Project Dashboard</h2>
        <Dashboard setupComplete={setupComplete} dashboardUrl={dashboardUrl} />
      </div>
    </div>
  );
}

export default App;
