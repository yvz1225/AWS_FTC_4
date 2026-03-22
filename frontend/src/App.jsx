import React, { useState, useRef, useEffect } from "react";
import "./index.css";
import { sendChat, retryChat, approveSpec, getActivity } from "./api/client";

function getContributionMeta(score) {
  if (score < 50) return { label: "기여도 낮음", color: "#e15b52", bg: "#fdecec" };
  if (score < 75) return { label: "주의", color: "#e2b64d", bg: "#fff6df" };
  return { label: "정상", color: "#56b887", bg: "#e9f8ef" };
}

function getScoreCircleStyle(score) {
  const meta = getContributionMeta(score);
  return { background: `conic-gradient(${meta.color} 0 ${score}%, #dfe4ec ${score}% 100%)` };
}

function getStatusLabel(status) {
  if (status === "done") return "완료";
  if (status === "doing") return "진행 중";
  return "대기";
}

export default function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { id: "msg-init", role: "assistant", content: "안녕하세요! 프로젝트 정보를 알려주시면 명세를 작성해 드릴게요.\n\n프로젝트명, 팀원, 역할, GitHub ID, 이메일, repo URL, 마감일, 작업 범위를 알려주세요." },
  ]);
  const [conversationId, setConversationId] = useState(null);
  const [specDraft, setSpecDraft] = useState(null);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [notionResult, setNotionResult] = useState(null);

  // 대시보드 데이터
  const [dashboardData, setDashboardData] = useState(null);
  const [showRideWarning, setShowRideWarning] = useState(true);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = useState({ teamSize: 4, budget: "10만 원", duration: "6주" });

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 채팅 전송
  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: msg }]);
    setLoading(true);

    try {
      const res = await sendChat(conversationId, msg);
      setConversationId(res.conversation_id);
      if (res.spec_draft && Object.keys(res.spec_draft).length > 0) {
        setSpecDraft(res.spec_draft);
      }
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: "assistant", content: res.reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { id: `e-${Date.now()}`, role: "assistant", content: `⚠️ 오류: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  // 재시도
  const handleRetry = async () => {
    try {
      const res = await retryChat();
      setConversationId(res.conversation_id);
      setSpecDraft(null);
      setNotionResult(null);
      setDashboardData(null);
      setMessages([{ id: "msg-retry", role: "assistant", content: "새 채팅을 시작합니다. 프로젝트 정보를 알려주세요!" }]);
    } catch (err) {
      alert("재시도 실패: " + err.message);
    }
  };

  // 승인 → Notion 생성
  const handleApprove = async () => {
    if (!conversationId || approving) return;
    setApproving(true);
    setMessages((prev) => [...prev, { id: `sys-${Date.now()}`, role: "assistant", content: "⏳ 명세를 검증하고 Notion 페이지를 생성 중입니다..." }]);

    try {
      const res = await approveSpec(conversationId);
      setNotionResult(res);
      setMessages((prev) => [...prev, {
        id: `notion-${Date.now()}`,
        role: "assistant",
        content: `✅ Notion 페이지가 생성되었습니다!\n\n🔗 ${res.notion_page_url}`,
      }]);
      // 승인 후 대시보드 자동 갱신
      try {
        const dash = await getActivity(res.project_id);
        setDashboardData(dash);
      } catch (_) {}
    } catch (err) {
      setMessages((prev) => [...prev, { id: `err-${Date.now()}`, role: "assistant", content: `❌ Notion 생성 실패: ${err.message}` }]);
    } finally {
      setApproving(false);
    }
  };

  // 대시보드 로드 (더미 프로젝트)
  const loadDashboard = async () => {
    try {
      const projectId = notionResult?.project_id || "demo-project-001";
      const res = await getActivity(projectId);
      setDashboardData(res);
    } catch (err) {
      console.error("대시보드 로드 실패:", err);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const members = dashboardData?.members || [];
  const lowMembers = members.filter((m) => m.activity_status === "낮음");
  const progress = members.length > 0
    ? Math.round(members.reduce((s, m) => s + m.activity_estimate, 0) / members.length)
    : 0;

  const downloadMarkdown = () => {
    if (!specDraft) return;
    const pi = specDraft.project_info || {};
    const content = [
      `# ${pi.name || "프로젝트"}`,
      `\nRepo: ${pi.repo_url || ""}`,
      `마감일: ${pi.deadline || ""}`,
      "\n## 팀원",
      ...(specDraft.members || []).map((m) => `- ${m.name} (${m.role}) - ${m.github_id} - ${m.email}`),
      "\n## Tasks",
      ...(specDraft.tasks || []).map((t) => `- ${t.name} | ${t.assignee} | ${t.deadline} | ${t.category}`),
    ].join("\n");
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "project-spec.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <h1>Talk to Notion-Build</h1>
          <p>채팅으로 요구사항을 정리하고 바로 실행 가능한 계획으로 바꿉니다.</p>
        </div>
      </header>

      <main className="page-wrap">
        <div className="dashboard-grid">
          {/* 좌측: 채팅 */}
          <section className="chat-panel">
            <div className="panel-header"><h2>요구사항 채팅</h2></div>
            <div className="chat-body">
              <div className="message-list">
                {messages.map((msg) => (
                  <div key={msg.id} className={msg.role === "user" ? "bubble user" : "bubble assistant"}>
                    {msg.content.split("\n").map((line, i) => (
                      <React.Fragment key={i}>{line}<br /></React.Fragment>
                    ))}
                  </div>
                ))}
                {loading && <div className="bubble assistant">💬 응답 생성 중...</div>}
                <div ref={chatEndRef} />
              </div>

              <div className="chat-input-area">
                <div className="input-row">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="프로젝트 정보를 입력하세요..."
                    disabled={loading}
                  />
                  <button className="primary-btn" onClick={handleSend} disabled={loading}>전송</button>
                </div>
                <div className="sub-button-row">
                  <button className="secondary-btn" onClick={handleRetry}>retry</button>
                  {specDraft && !notionResult && (
                    <button className="primary-btn" onClick={handleApprove} disabled={approving}>
                      {approving ? "생성 중..." : "✅ 승인 (Notion 생성)"}
                    </button>
                  )}
                  <button className="secondary-btn" onClick={() => setIsConfigOpen(true)}>config</button>
                </div>
              </div>
            </div>
          </section>

          {/* 우측 패널 */}
          <section className="right-panel">
            <div className="top-row-grid">
              <div className="left-col">
                <div className="card summary-card">
                  <div className="summary-content">
                    <h3>프로젝트 요약</h3>
                    <p className="summary-title">
                      {specDraft ? specDraft.project_info?.name : "아직 생성된 프로젝트가 없습니다."}
                    </p>
                    <p className="summary-text">
                      {specDraft
                        ? `팀원 ${specDraft.members?.length || 0}명 · Task ${specDraft.tasks?.length || 0}개 · 마감 ${specDraft.project_info?.deadline || "미정"}`
                        : "왼쪽 채팅창에 프로젝트 개요를 입력하면 계획이 생성됩니다."}
                    </p>
                    {notionResult && (
                      <p style={{ marginTop: 8, fontSize: 13, color: "#56b887" }}>
                        ✅ Notion 생성 완료
                      </p>
                    )}
                  </div>
                  <div className="summary-actions">
                    {notionResult && (
                      <button className="notion-btn" onClick={() => window.open(notionResult.notion_page_url, "_blank")}>
                        Notion 열기
                      </button>
                    )}
                    <button className="markdown-btn" onClick={downloadMarkdown} disabled={!specDraft}>
                      Markdown 다운로드
                    </button>
                  </div>
                </div>
              </div>

              <div className="card milestone-card">
                <h3>Task 목록</h3>
                <div className="milestone-list">
                  {specDraft && specDraft.tasks?.map((task, i) => (
                    <div key={i} className="milestone-item">
                      <div>
                        <p className="milestone-title">{task.name}</p>
                        <p className="milestone-due">담당: {task.assignee} · 마감: {task.deadline}</p>
                      </div>
                      <span className="status-badge todo">{task.category || "일반"}</span>
                    </div>
                  ))}
                  {!specDraft && <div className="empty-box">Task 데이터가 아직 없습니다.</div>}
                </div>
              </div>
            </div>

            {/* 하단: 진행률 + 팀원 참여도 */}
            <div className="card">
              <div className="progress-member-header">
                <div className="progress-inline">
                  <div className="card-row">
                    <h3>팀원 활동 지표</h3>
                    <span className="progress-value">{progress}점</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${Math.min(progress * 10, 100)}%` }} />
                  </div>
                </div>
                {lowMembers.length > 0 && (
                  <span className="warning-pill">경고 {lowMembers.length}명</span>
                )}
              </div>
              <div className="divider" />
              <p className="section-label">팀원 참여도</p>
              <div className="member-grid">
                {members.map((member, i) => {
                  const est = Math.round(member.activity_estimate * 10);
                  const meta = getContributionMeta(est);
                  return (
                    <div key={i} className="member-card">
                      <div className="score-circle" style={getScoreCircleStyle(est)}>
                        <div style={{ width: 68, height: 68, borderRadius: "9999px", background: "#fff", display: "grid", placeItems: "center" }}>
                          <span style={{ color: "#1b2236", fontSize: 16, fontWeight: 800 }}>{est}%</span>
                        </div>
                      </div>
                      <p className="member-name">{member.name}</p>
                      <p className="member-email" style={{ fontSize: 11, color: "#888" }}>
                        커밋 {member.git_commits}회 · Notion {member.notion_completed}개
                      </p>
                      <p className="member-status" style={{ color: meta.color }}>{member.activity_status}</p>
                    </div>
                  );
                })}
                {members.length === 0 && <div className="empty-box">참여도 데이터가 아직 없습니다.</div>}
              </div>
              <button className="secondary-btn" style={{ marginTop: 12 }} onClick={loadDashboard}>
                🔄 새로고침
              </button>
            </div>
          </section>
        </div>
      </main>

      {/* 무임승차 경고 토스트 */}
      {lowMembers.length > 0 && showRideWarning && (
        <div className="warning-toast">
          <div className="warning-top">
            <div>
              <p className="warning-title">무임승차 경고</p>
              <p className="warning-desc">참여도가 낮은 팀원이 있습니다.</p>
            </div>
            <button className="toast-close-btn" onClick={() => setShowRideWarning(false)}>×</button>
          </div>
          <div className="warning-list">
            {lowMembers.map((m, i) => (
              <div key={i} className="warning-user-card">
                <div>
                  <p className="warning-user-name">{m.name}</p>
                  <p className="warning-user-meta">활동지표 {Math.round(m.activity_estimate * 10)}% · {m.activity_status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 설정 모달 */}
      {isConfigOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-top">
              <h3>프로젝트 설정</h3>
              <button className="modal-close-btn" onClick={() => setIsConfigOpen(false)}>×</button>
            </div>
            <div className="form-group">
              <label>팀원 수</label>
              <input type="number" min={1} max={6} value={config.teamSize}
                onChange={(e) => setConfig((p) => ({ ...p, teamSize: Number(e.target.value) || 1 }))} />
            </div>
            <div className="form-group">
              <label>예산</label>
              <input value={config.budget} onChange={(e) => setConfig((p) => ({ ...p, budget: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>기간</label>
              <input value={config.duration} onChange={(e) => setConfig((p) => ({ ...p, duration: e.target.value }))} />
            </div>
            <button className="apply-btn" onClick={() => setIsConfigOpen(false)}>적용</button>
          </div>
        </div>
      )}
    </div>
  );
}
