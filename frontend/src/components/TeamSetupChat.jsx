import React, { useState, useRef, useEffect } from 'react';

export default function TeamSetupChat({ onSetupComplete }) {
  const [messages, setMessages] = useState([{ sender: 'bot', text: '안녕하세요! Team-Up Sentinel 매니저입니다. 프로젝트 주제와 목표를 알려주시겠어요?' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom() }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      // In real App: await axios.post('API_URL/agent/manager', { message: userMsg });
      setTimeout(() => {
        const botReply = userMsg.includes('승인') ? 
          "✅ 프로젝트 설정이 승인되었습니다! Builder Agent가 백그라운드에서 노션 인프라를 구축합니다..." :
          "좋습니다. 팀원들의 이름, 역할, GitHub ID, 이메일을 더 자세히 알려주시겠어요? (최초 빌드를 위해 '승인'을 외쳐주세요)";
        
        setMessages(prev => [...prev, { sender: 'bot', text: botReply }]);
        
        if (userMsg.includes('승인')) {
          setTimeout(() => onSetupComplete('https://notion.so/mock-dashboard'), 2500);
        }
        setLoading(false);
      }, 1200);
      
    } catch (e) {
      setMessages(prev => [...prev, { sender: 'bot', text: '오류가 발생했습니다.' }]);
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '1rem' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
            background: msg.sender === 'user' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
            border: msg.sender === 'user' ? 'none' : '1px solid var(--border)',
            padding: '0.8rem 1.2rem',
            borderRadius: '12px',
            maxWidth: '85%',
            lineHeight: '1.5'
          }}>
            {msg.text}
          </div>
        ))}
        {loading && <div style={{ alignSelf: 'flex-start', padding: '0.8rem', color: 'var(--text-muted)' }}>Thinking...</div>}
        <div ref={messagesEndRef} />
      </div>
      
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input 
          style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', padding: '0.8rem', borderRadius: '8px', color: 'white', outline: 'none' }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="메시지를 입력하세요..."
        />
        <button 
          onClick={handleSend}
          disabled={loading}
          style={{ background: 'var(--accent)', color: 'white', border: 'none', padding: '0 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          전송
        </button>
      </div>
    </div>
  );
}
