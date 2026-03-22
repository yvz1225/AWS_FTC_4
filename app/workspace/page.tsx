"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type ChecklistItem = {
  id: number;
  title: string;
  done: boolean;
  required: boolean;
};

type RoleItem = {
  role: string;
  owner: string;
  tasks: string[];
};

type MilestoneItem = {
  title: string;
  due: string;
  status: "todo" | "doing" | "done";
};

type PlanResult = {
  projectTitle: string;
  summary: string;
  followUpQuestions: string[];
  checklist: ChecklistItem[];
  roles: RoleItem[];
  milestones: MilestoneItem[];
  originalPrompt: string;
};

type ConfigState = {
  teamSize: number;
  budget: string;
  duration: string;
};

function remakePlan(prompt: string, config: ConfigState): PlanResult {
  return {
    projectTitle: prompt,
    summary: `${config.teamSize}명이 ${config.duration} 동안 진행하는 프로젝트입니다. 예산은 ${config.budget} 기준으로 결과를 다시 구성했습니다.`,
    followUpQuestions: [
      "하드웨어 구매가 필요한가요?",
      "디자인 작업 비중은 어느 정도인가요?",
      "최종 발표 자료는 누가 맡나요?",
    ],
    checklist: [
      { id: 1, title: "요구사항 정리", done: true, required: true },
      { id: 2, title: "화면 설계", done: false, required: true },
      { id: 3, title: "Notion 페이지 생성", done: false, required: true },
      { id: 4, title: "최종 발표 자료", done: false, required: true },
    ],
    roles: [
      {
        role: "프론트엔드",
        owner: "팀원 A",
        tasks: ["채팅 UI", "상세 페이지 UI", "상태 관리"],
      },
      {
        role: "백엔드",
        owner: "팀원 B",
        tasks: ["Bedrock 연동", "Notion API", "진행률 API"],
      },
      {
        role: "기획/디자인",
        owner: "팀원 C",
        tasks: ["요구사항 구체화", "발표 자료", "시연 시나리오"],
      },
    ],
    milestones: [
      { title: "D1 요구사항 정리", due: "D1", status: "done" },
      { title: "D2 UI 구현", due: "D2", status: "doing" },
      { title: "D3 Notion 연동", due: "D3", status: "todo" },
      { title: "D4 시연 준비", due: "D4", status: "todo" },
    ],
    originalPrompt: prompt,
  };
}

export default function WorkspacePage() {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [notice, setNotice] = useState("");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [notionApproved, setNotionApproved] = useState(false);
  const [config, setConfig] = useState<ConfigState>({
    teamSize: 3,
    budget: "5만 원",
    duration: "2주",
  });

  useEffect(() => {
    const saved = sessionStorage.getItem("generatedPlan");

    if (!saved) {
      router.push("/");
      return;
    }

    const parsed: PlanResult = JSON.parse(saved);
    setPlan(parsed);
    setMessages([
      {
        role: "assistant",
        content: "요구사항 분석이 완료되었습니다. 오른쪽에서 결과를 검토하세요.",
      },
      {
        role: "user",
        content: parsed.originalPrompt,
      },
      {
        role: "assistant",
        content:
          "체크리스트, 역할 분담, 마일스톤을 생성했습니다. 필요하면 retry 또는 config를 사용하세요.",
      },
    ]);
  }, [router]);

  const progress = useMemo(() => {
    if (!plan) return 0;
    const total = plan.checklist.length;
    const done = plan.checklist.filter((item) => item.done).length;
    return total === 0 ? 0 : Math.round((done / total) * 100);
  }, [plan]);

  const toggleChecklist = (id: number) => {
    if (!plan) return;

    setPlan({
      ...plan,
      checklist: plan.checklist.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item
      ),
    });
  };

  const handleRetry = () => {
    if (!plan) return;

    const updatedPlan = remakePlan(plan.originalPrompt, config);
    setPlan(updatedPlan);
    sessionStorage.setItem("generatedPlan", JSON.stringify(updatedPlan));
    setNotionApproved(false);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "현재 설정값을 기준으로 결과를 다시 생성했습니다.",
      },
    ]);
    setNotice("결과를 다시 생성했습니다.");
  };

  const handleSend = () => {
    if (!input.trim()) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: input.trim() },
      {
        role: "assistant",
        content:
          "현재는 목업 채팅 상태입니다. 다음 단계에서 Bedrock/Claude와 연결하면 실제 응답으로 바뀝니다.",
      },
    ]);
    setInput("");
  };

  const handleApproveNotion = () => {
    if (!plan) {
      setNotice("먼저 계획을 생성하세요.");
      return;
    }

    setNotionApproved(true);
    setNotice("notion 업로드 승인 상태입니다. 다음 단계에서 실제 API와 연결하면 됩니다.");
  };

  const handleCompleteProject = () => {
    if (!plan) return;

    if (!notionApproved) {
      setNotice("먼저 notion 업로드 승인을 눌러주세요.");
      return;
    }

    const finalTask = plan.checklist.find(
      (item) => item.title === "최종 발표 자료"
    );

    if (!finalTask?.done) {
      setNotice("노션에서 필수 항목을 먼저 완료하세요. '최종 발표 자료'가 아직 미완료입니다.");
      return;
    }

    setNotice("모든 조건이 충족되었습니다. 프로젝트 완료 처리 가능합니다.");
  };

  if (!plan) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-slate-700">데이터를 불러오는 중입니다...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1440px] px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Talk to Notion-Build</h1>
              <p className="mt-1 text-sm text-slate-600">
                생성된 계획을 검토하고 Notion 업로드 전 승인합니다.
              </p>
            </div>

            <button
              onClick={() => router.push("/")}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium"
            >
              처음으로
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-6 py-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className="h-[calc(100vh-140px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-4">
              <h2 className="text-lg font-semibold">요구사항 채팅</h2>
              <p className="mt-1 text-sm text-slate-500">
                채팅은 작게 두고, 오른쪽에서 결과를 집중해서 확인합니다.
              </p>
            </div>

            <div className="flex h-[calc(100%-81px)] flex-col">
              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4">
                {messages.map((msg, index) => (
                  <div
                    key={index}
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSend();
                    }}
                    className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500"
                    placeholder="추가 질문이나 수정 요청 입력"
                  />
                  <button
                    onClick={handleSend}
                    className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
                  >
                    전송
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={handleRetry}
                    className="rounded-xl border border-slate-300 bg-white py-3 text-sm font-medium"
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

          <section className="h-[calc(100vh-140px)] overflow-y-auto pr-1">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">프로젝트 요약</h3>
                    <p className="mt-2 text-base font-medium">
                      {plan.projectTitle}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {plan.summary}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    Demo
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-semibold">맞춤형 체크리스트</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    항목을 클릭하면 완료 상태가 바뀝니다.
                  </p>

                  <ul className="mt-4 space-y-2">
                    {plan.checklist.map((item) => (
                      <li
                        key={item.id}
                        onClick={() => toggleChecklist(item.id)}
                        className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm hover:bg-slate-100"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">
                            {item.done ? "✅" : "⬜"} {item.title}
                            {item.required ? " (필수)" : ""}
                          </span>
                          <span className="text-xs text-slate-500">클릭</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-semibold">역할 분담표</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    팀원별 주요 작업을 확인합니다.
                  </p>

                  <ul className="mt-4 space-y-2">
                    {plan.roles.map((item, index) => (
                      <li
                        key={index}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <div className="text-sm font-semibold">{item.role}</div>
                        <div className="mt-1 text-sm text-slate-600">
                          담당: {item.owner}
                        </div>
                        <div className="mt-1 text-sm text-slate-700">
                          업무: {item.tasks.join(", ")}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-semibold">마일스톤</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    일정과 현재 상태를 확인합니다.
                  </p>

                  <ul className="mt-4 space-y-2">
                    {plan.milestones.map((item, index) => (
                      <li
                        key={index}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">{item.title}</span>
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
                            {item.status}
                          </span>
                        </div>
                        <div className="mt-2 text-slate-500">기한: {item.due}</div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-lg font-semibold">진행률</h3>
                    <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                      현재 진행률 {progress}%
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-lg font-semibold">액션</h3>
                    <div className="mt-4 space-y-2">
                      <button
                        onClick={handleApproveNotion}
                        className="w-full rounded-xl bg-blue-600 py-3 text-sm font-medium text-white"
                      >
                        notion 업로드 승인
                      </button>
                      <button
                        onClick={handleCompleteProject}
                        className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-medium text-white"
                      >
                        프로젝트 완료
                      </button>
                    </div>
                  </div>

                  {notice && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="text-sm font-semibold">상태 메시지</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {notice}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
            <h3 className="text-xl font-semibold">config</h3>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">팀원 수</label>
                <input
                  type="number"
                  value={config.teamSize}
                  onChange={(e) =>
                    setConfig({ ...config, teamSize: Number(e.target.value) })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">예산</label>
                <input
                  value={config.budget}
                  onChange={(e) =>
                    setConfig({ ...config, budget: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">기간</label>
                <input
                  value={config.duration}
                  onChange={(e) =>
                    setConfig({ ...config, duration: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsConfigOpen(false)}
                className="rounded-xl border border-slate-300 py-3 text-sm font-medium"
              >
                닫기
              </button>
              <button
                onClick={() => {
                  setIsConfigOpen(false);
                  setNotice("config가 저장되었습니다.");
                }}
                className="rounded-xl bg-slate-900 py-3 text-sm font-medium text-white"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}