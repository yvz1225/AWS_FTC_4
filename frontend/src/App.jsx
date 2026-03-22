import React, { useMemo, useState } from "react";
import "./index.css";

const MEMBER_LABELS = ["A", "B", "C", "D", "E", "F"];

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomScore() {
  const roll = Math.random();

  if (roll < 0.2) return randomBetween(30, 49);
  if (roll < 0.7) return randomBetween(50, 74);
  return randomBetween(75, 95);
}

function getContributionMeta(score) {
  if (score < 50) {
    return {
      label: "기여도 낮음",
      color: "#e15b52",
      bg: "#fdecec",
    };
  }

  if (score < 75) {
    return {
      label: "보통",
      color: "#e2b64d",
      bg: "#fff6df",
    };
  }

  return {
    label: "정상",
      color: "#56b887",
      bg: "#e9f8ef",
    };
}

function getScoreCircleStyle(score) {
  const meta = getContributionMeta(score);

  return {
    background: `conic-gradient(${meta.color} 0 ${score}%, #dfe4ec ${score}% 100%)`,
  };
}

function getScoreCircleInnerStyle() {
  return {
    width: "68px",
    height: "68px",
    borderRadius: "9999px",
    background: "#ffffff",
    display: "grid",
    placeItems: "center",
  };
}

function makeContributions(teamSize) {
  return Array.from({ length: teamSize }, (_, index) => {
    const label = MEMBER_LABELS[index] || String(index + 1);

    return {
      id: `member-${label}`,
      name: `팀원 ${label}`,
      email: `member${label.toLowerCase()}@example.com`,
      score: getRandomScore(),
    };
  });
}

function makePlan(prompt, config) {
  return {
    projectTitle: prompt,
    summary: `${config.teamSize}명이 ${config.duration} 동안 진행하는 프로젝트입니다. 예산은 ${config.budget} 기준으로 계획을 구성했습니다. 요구사항 정리, 화면 구현, Notion 연동, 발표 준비 흐름으로 바로 볼 수 있게 정리했습니다.`,
    milestones: [
      { id: "ms-1", title: "요구사항 정리", due: "D1", status: "done" },
      { id: "ms-2", title: "UI 설계 및 화면 구현", due: "D2", status: "doing" },
      { id: "ms-3", title: "Notion 연동 및 문서 정리", due: "D3", status: "todo" },
    ],
    contributions: makeContributions(config.teamSize),
  };
}

function getProgressValue(status) {
  if (status === "done") return 1;
  if (status === "doing") return 0.5;
  return 0;
}

function getStatusLabel(status) {
  if (status === "done") return "완료";
  if (status === "doing") return "진행 중";
  return "대기";
}

export default function App() {
  const [input, setInput] = useState("");
  const [lastPrompt, setLastPrompt] = useState("");
  const [messages, setMessages] = useState([
    {
      id: "msg-initial",
      role: "assistant",
      content: "프로젝트 개요를 입력하면 진행률, 마일스톤, 팀원 참여도를 정리합니다.",
    },
  ]);
  const [plan, setPlan] = useState(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [showRideWarning, setShowRideWarning] = useState(true);
  const [config, setConfig] = useState({
    teamSize: 4,
    budget: "10만 원",
    duration: "6주",
  });

  const safeTeamSize = Math.min(6, Math.max(1, Number(config.teamSize) || 1));

  const progress = useMemo(() => {
    if (!plan || plan.milestones.length === 0) return 0;
    const total = plan.milestones.length;
    const score = plan.milestones.reduce(
      (acc, item) => acc + getProgressValue(item.status),
      0
    );
    return Math.round((score / total) * 100);
  }, [plan]);

  const lowContributionMembers = useMemo(() => {
    if (!plan) return [];
    return plan.contributions.filter((member) => member.score < 50);
  }, [plan]);

  const handleSend = () => {
    if (!input.trim()) return;

    const prompt = input.trim();
    const nextPlan = makePlan(prompt, {
      ...config,
      teamSize: safeTeamSize,
    });

    setMessages((prev) => [
      ...prev,
      {
        id: createId("msg-user"),
        role: "user",
        content: prompt,
      },
      {
        id: createId("msg-assistant"),
        role: "assistant",
        content: "요구사항 분석을 마쳤습니다. 오른쪽 패널에서 계획을 확인하세요.",
      },
    ]);

    setPlan(nextPlan);
    setLastPrompt(prompt);
    setInput("");
    setShowRideWarning(true);
  };

  const handleRetry = () => {
    if (!lastPrompt.trim()) return;

    const nextPlan = makePlan(lastPrompt, {
      ...config,
      teamSize: safeTeamSize,
    });

    setPlan(nextPlan);
    setShowRideWarning(true);
  };

  const downloadMarkdown = () => {
    if (!plan) return;

    const content = [
      `# ${plan.projectTitle}`,
      "",
      "## 프로젝트 요약",
      plan.summary,
      "",
      "## 전체 진행률",
      `${progress}%`,
      "",
      "## 마일스톤",
      ...plan.milestones.map(
        (m) => `- ${m.title} | ${m.due} | ${getStatusLabel(m.status)}`
      ),
      "",
      "## 팀원 참여도",
      ...plan.contributions.map(
        (member) => `- ${member.name}: ${member.score}% (${member.email})`
      ),
    ].join("\n");

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plan.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendWarningMail = (member) => {
    const subject = encodeURIComponent(
      `[참여 요청] ${plan ? plan.projectTitle : "프로젝트"} 진행 관련`
    );

    const body = encodeURIComponent(
      `${member.name}님,\n\n현재 프로젝트 참여도가 낮게 표시되고 있습니다.\n진행 상황을 확인하고 작업 현황을 공유해 주세요.\n\n감사합니다.`
    );

    window.location.href = `mailto:${member.email}?subject=${subject}&body=${body}`;
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
          <section className="chat-panel">
            <div className="panel-header">
              <h2>요구사항 채팅</h2>
            </div>

            <div className="chat-body">
              <div className="message-list">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={msg.role === "user" ? "bubble user" : "bubble assistant"}
                  >
                    {msg.content}
                  </div>
                ))}
              </div>

              <div className="chat-input-area">
                <div className="input-row">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="예: 4명이 6주 동안 진행하는 React 기반 캡스톤 프로젝트"
                  />
                  <button className="primary-btn" onClick={handleSend}>
                    전송
                  </button>
                </div>

                <div className="sub-button-row">
                  <button
                    className="secondary-btn"
                    onClick={handleRetry}
                    disabled={!lastPrompt}
                  >
                    retry
                  </button>
                  <button
                    className="secondary-btn"
                    onClick={() => setIsConfigOpen(true)}
                  >
                    config
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="right-panel">
            {/* 상단: 요약(좁게) + 마일스톤(넓게) */}
            <div className="top-row-grid">
              <div className="left-col">
                <div className="card summary-card">
                  <div className="summary-content">
                    <h3>프로젝트 요약</h3>
                    <p className="summary-title">
                      {plan ? plan.projectTitle : "아직 생성된 프로젝트가 없습니다."}
                    </p>
                    <p className="summary-text">
                      {plan
                        ? plan.summary
                        : "왼쪽 채팅창에 프로젝트 개요를 입력하면 계획이 생성됩니다."}
                    </p>
                  </div>
                  <div className="summary-actions">
                    <button className="notion-btn" onClick={() => alert("Notion 연결 예정")}>
                      Notion 내보내기
                    </button>
                    <button className="markdown-btn" onClick={downloadMarkdown} disabled={!plan}>
                      Markdown 다운로드
                    </button>
                  </div>
                </div>
              </div>

              <div className="card milestone-card">
                <h3>마일스톤</h3>
                <div className="milestone-list">
                  {plan &&
                    plan.milestones.map((milestone) => (
                      <div key={milestone.id} className="milestone-item">
                        <div>
                          <p className="milestone-title">{milestone.title}</p>
                          <p className="milestone-due">마감: {milestone.due}</p>
                        </div>
                        <span className={`status-badge ${milestone.status}`}>
                          {getStatusLabel(milestone.status)}
                        </span>
                      </div>
                    ))}
                  {!plan && (
                    <div className="empty-box">마일스톤 데이터가 아직 없습니다.</div>
                  )}
                </div>
              </div>
            </div>

            {/* 하단: 진행률 + 팀원 참여도 통합 카드 */}
            <div className="card">
              <div className="progress-member-header">
                <div className="progress-inline">
                  <div className="card-row">
                    <h3>전체 진행률</h3>
                    <span className="progress-value">{progress}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                {lowContributionMembers.length > 0 && (
                  <span className="warning-pill">경고 {lowContributionMembers.length}명</span>
                )}
              </div>

              <div className="divider" />

              <p className="section-label">팀원 참여도</p>
              <div className="member-grid">
                {(plan ? plan.contributions : []).map((member) => {
                  const meta = getContributionMeta(member.score);
                  return (
                    <div key={member.id} className="member-card">
                      <div className="score-circle" style={getScoreCircleStyle(member.score)}>
                        <div style={getScoreCircleInnerStyle()}>
                          <span style={{ color: "#1b2236", fontSize: "16px", fontWeight: 800 }}>
                            {member.score}%
                          </span>
                        </div>
                      </div>
                      <p className="member-name">{member.name}</p>
                      <p className="member-email">{member.email}</p>
                      <p className="member-status" style={{ color: meta.color }}>
                        {meta.label}
                      </p>
                    </div>
                  );
                })}
                {!plan && (
                  <div className="empty-box">참여도 데이터가 아직 없습니다.</div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      {plan && lowContributionMembers.length > 0 && showRideWarning && (
        <div className="warning-toast">
          <div className="warning-top">
            <div>
              <p className="warning-title">무임승차 경고</p>
              <p className="warning-desc">
                참여도가 낮은 팀원이 있습니다. 바로 메일을 보낼 수 있습니다.
              </p>
            </div>

            <button
              className="toast-close-btn"
              onClick={() => setShowRideWarning(false)}
            >
              ×
            </button>
          </div>

          <div className="warning-list">
            {lowContributionMembers.map((member) => (
              <div key={member.id} className="warning-user-card">
                <div>
                  <p className="warning-user-name">{member.name}</p>
                  <p className="warning-user-meta">
                    참여도 {member.score}% · {member.email}
                  </p>
                </div>

                <button
                  className="mail-btn"
                  onClick={() => sendWarningMail(member)}
                >
                  메일 보내기
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {isConfigOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-top">
              <h3>프로젝트 설정</h3>
              <button
                className="modal-close-btn"
                onClick={() => setIsConfigOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="form-group">
              <label>팀원 수</label>
              <input
                type="number"
                min={1}
                max={6}
                value={config.teamSize}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    teamSize: Math.min(6, Math.max(1, Number(e.target.value) || 1)),
                  }))
                }
              />
            </div>

            <div className="form-group">
              <label>예산</label>
              <input
                value={config.budget}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    budget: e.target.value,
                  }))
                }
              />
            </div>

            <div className="form-group">
              <label>기간</label>
              <input
                value={config.duration}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    duration: e.target.value,
                  }))
                }
              />
            </div>

            <button className="apply-btn" onClick={() => setIsConfigOpen(false)}>
              적용
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
