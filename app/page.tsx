"use client";

import { useMemo, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type MilestoneStatus = "todo" | "doing" | "done";

type MilestoneItem = {
  id: string;
  title: string;
  due: string;
  status: MilestoneStatus;
};

type Contribution = {
  id: string;
  name: string;
  email: string;
  score: number;
};

type PlanResult = {
  projectTitle: string;
  summary: string;
  milestones: MilestoneItem[];
  contributions: Contribution[];
};

type ConfigState = {
  teamSize: number;
  budget: string;
  duration: string;
};

const MEMBER_LABELS = ["A", "B", "C", "D", "E", "F"];
const SCORE_POOL = [91, 84, 68, 42, 57, 73];

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeContributions(teamSize: number): Contribution[] {
  return Array.from({ length: teamSize }, (_, index) => {
    const label = MEMBER_LABELS[index] ?? String(index + 1);
    return {
      id: `member-${label}`,
      name: `팀원 ${label}`,
      email: `member${label.toLowerCase()}@example.com`,
      score: Math.floor(Math.random() * 60) + 40, // 40~99 사이 랜덤
    };
  });
}


function makePlan(prompt: string, config: ConfigState): PlanResult {
  return {
    projectTitle: prompt,
    summary: `${config.teamSize}명이 ${config.duration} 동안 진행하는 프로젝트입니다. 예산은 ${config.budget} 기준으로 계획을 구성했습니다. 요구사항 정리, 화면 구현, Notion 연동, 발표 준비 흐름으로 바로 볼 수 있게 정리했습니다.`,
    milestones: [
      { id: "ms-1", title: "요구사항 정리", due: "D1", status: "done" },
      { id: "ms-2", title: "UI 설계 및 화면 구현", due: "D2", status: "doing" },
      { id: "ms-3", title: "Notion 연동 및 문서 정리", due: "D3", status: "todo" },
      { id: "ms-4", title: "최종 시연 및 발표 준비", due: "D4", status: "todo" },
    ],
    contributions: makeContributions(config.teamSize),
  };
}

function getProgressValue(status: MilestoneStatus) {
  if (status === "done") return 1;
  if (status === "doing") return 0.5;
  return 0;
}

function getStatusLabel(status: MilestoneStatus) {
  if (status === "done") return "완료";
  if (status === "doing") return "진행 중";
  return "대기";
}

function getStatusClassName(status: MilestoneStatus) {
  if (status === "done") {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "doing") {
    return "border border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border border-slate-200 bg-slate-100 text-slate-600";
}

export default function HomePage() {
  const [input, setInput] = useState("");
  const [lastPrompt, setLastPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-initial",
      role: "assistant",
      content: "프로젝트 개요를 입력하면 진행률, 마일스톤, 팀원 참여도를 정리합니다.",
    },
  ]);
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [showRideWarning, setShowRideWarning] = useState(true);
  const [config, setConfig] = useState<ConfigState>({
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
    setPlan(
      makePlan(lastPrompt, {
        ...config,
        teamSize: safeTeamSize,
      })
    );
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

  const sendWarningMail = (member: Contribution) => {
    const subject = encodeURIComponent(
      `[참여 요청] ${plan?.projectTitle ?? "프로젝트"} 진행 관련`
    );

    const body = encodeURIComponent(
      `${member.name}님,\n\n현재 프로젝트 참여도가 낮게 표시되고 있습니다.\n진행 상황을 확인하고 작업 현황을 공유해 주세요.\n\n감사합니다.`
    );

    window.location.href = `mailto:${member.email}?subject=${subject}&body=${body}`;
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1440px] px-6 py-5">
          <h1 className="text-2xl font-bold">Talk to Notion-Build</h1>
          <p className="mt-1 text-sm text-slate-600">
            채팅으로 요구사항을 정리하고 바로 실행 가능한 계획으로 바꿉니다.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-6 py-6">
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          {/* 왼쪽 채팅 */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm h-[560px] lg:h-[640px]">
            <div className="border-b border-slate-200 px-4 py-4">
              <h2 className="text-lg font-semibold">요구사항 채팅</h2>
            </div>

            <div className="flex h-[calc(100%-73px)] flex-col">
              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={
                      msg.role === "user"
                        ? "ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-blue-600 px-4 py-3 text-sm text-white"
                        : "max-w-[85%] rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800"
                    }
                  >
                    {msg.content}
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 bg-white p-4">
                <div className="flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500"
                    placeholder="예: 4명이 6주 동안 진행하는 React 기반 캡스톤 프로젝트"
                  />
                  <button
                    onClick={handleSend}
                    className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-black"
                  >
                    전송
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={handleRetry}
                    disabled={!lastPrompt}
                    className="rounded-xl border border-slate-300 bg-white py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    retry
                  </button>
                  <button
                    onClick={() => setIsConfigOpen(true)}
                    className="rounded-xl border border-slate-300 bg-white py-3 text-sm font-medium"
                  >
                    config
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* 오른쪽 대시보드 */}
          <section className="h-[calc(100vh-140px)] space-y-4 overflow-y-auto pr-1">
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">프로젝트 요약</h3>
                <p className="mt-2 text-base font-bold text-blue-700">
                  {plan ? plan.projectTitle : "아직 생성된 프로젝트가 없습니다."}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {plan
                    ? plan.summary
                    : "왼쪽 채팅창에 프로젝트 개요를 입력하면 계획이 생성됩니다."}
                </p>
              </div>

              <div className="flex w-full flex-col gap-2 lg:w-[220px]">
                <button
                  onClick={() => alert("Notion 연결 예정")}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-black py-3 text-sm font-bold text-white shadow-sm hover:bg-zinc-800"
                >
                  <span className="text-lg font-black">N</span>
                  Notion 내보내기
                </button>
                <button
                  onClick={downloadMarkdown}
                  disabled={!plan}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-white py-2 text-xs font-bold text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="text-sm">M↓</span>
                  Markdown 다운로드
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">전체 진행률</h3>
                <span className="text-sm font-semibold text-emerald-600">
                  {progress}%
                </span>
              </div>
              <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-slate-600">{progress}% 완료</p>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">팀원 참여도</h3>
                  {lowContributionMembers.length > 0 && (
                    <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600">
                      경고 {lowContributionMembers.length}명
                    </span>
                  )}
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {(plan?.contributions || []).map((member) => (
                    <div
                      key={member.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-center justify-center">
                        <div className="relative flex h-16 w-16 items-center justify-center">
                          <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                            <circle
                              cx="18"
                              cy="18"
                              r="16"
                              fill="none"
                              stroke="#e2e8f0"
                              strokeWidth="3"
                            />
                            <circle
                              cx="18"
                              cy="18"
                              r="16"
                              fill="none"
                              stroke={member.score < 50 ? "#ef4444" : "#10b981"}
                              strokeWidth="3"
                              strokeDasharray={`${member.score}, 100`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute text-xs font-bold">
                            {member.score}%
                          </span>
                        </div>
                      </div>

                      <p className="mt-3 text-center text-sm font-semibold">
                        {member.name}
                      </p>
                      <p
                        className={`mt-1 text-center text-xs font-medium ${
                          member.score < 50 ? "text-rose-600" : "text-slate-500"
                        }`}
                      >
                        {member.score < 50 ? "기여도 낮음" : "정상"}
                      </p>
                    </div>
                  ))}

                  {!plan && (
                    <div className="col-span-full rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-400">
                      참여도 데이터가 아직 없습니다.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold">마일스톤</h3>

                <ul className="mt-4 space-y-3">
                  {plan?.milestones.map((milestone) => (
                    <li
                      key={milestone.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {milestone.title}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            마감: {milestone.due}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClassName(
                            milestone.status
                          )}`}
                        >
                          {getStatusLabel(milestone.status)}
                        </span>
                      </div>
                    </li>
                  ))}

                  {!plan && (
                    <li className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-400">
                      마일스톤 데이터가 아직 없습니다.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* 경고창 */}
      {plan && lowContributionMembers.length > 0 && showRideWarning && (
        <div className="fixed right-6 top-6 z-50 w-[360px] rounded-2xl border border-rose-300 bg-rose-50 p-4 shadow-2xl ring-1 ring-rose-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-rose-700">무임승차 경고</p>
              <p className="mt-1 text-xs leading-5 text-rose-700">
                참여도가 낮은 팀원이 있습니다. 바로 메일을 보낼 수 있습니다.
              </p>
            </div>
            <button
              onClick={() => setShowRideWarning(false)}
              className="rounded-md px-2 py-1 text-xs text-rose-400 hover:bg-white hover:text-rose-700"
              aria-label="경고 닫기"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {lowContributionMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-xl border border-rose-200 bg-white px-3 py-3"
              >
                <div className="pr-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {member.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    참여도 {member.score}% · {member.email}
                  </p>
                </div>

                <button
                  onClick={() => sendWarningMail(member)}
                  className="shrink-0 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                >
                  메일 보내기
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* config 모달 */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">프로젝트 설정</h3>
              <button
                onClick={() => setIsConfigOpen(false)}
                className="rounded-md px-2 py-1 text-sm text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  팀원 수
                </label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={config.teamSize}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      teamSize: Math.min(
                        6,
                        Math.max(1, Number(e.target.value) || 1)
                      ),
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  예산
                </label>
                <input
                  value={config.budget}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      budget: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  기간
                </label>
                <input
                  value={config.duration}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      duration: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                />
              </div>
            </div>

            <button
              onClick={() => {
                setConfig((prev) => ({
                  ...prev,
                  teamSize: safeTeamSize,
                }));
                setIsConfigOpen(false);
              }}
              className="mt-5 w-full rounded-xl bg-slate-900 py-3 text-sm font-medium text-white hover:bg-black"
            >
              적용
            </button>
          </div>
        </div>
      )}
    </main>
  );
}