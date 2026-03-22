/**
 * Backend API 클라이언트
 */
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || JSON.stringify(err));
  }
  return res.json();
}

/** 채팅 메시지 전송 */
export function sendChat(conversationId, message) {
  return request("/chat", {
    method: "POST",
    body: JSON.stringify({ conversation_id: conversationId, message }),
  });
}

/** 새 채팅 세션 */
export function retryChat() {
  return request("/chat/retry", { method: "POST" });
}

/** Project_Spec 승인 → 검증 → Notion 생성 */
export function approveSpec(conversationId) {
  return request("/approve", {
    method: "POST",
    body: JSON.stringify({ conversation_id: conversationId }),
  });
}

/** 대시보드 활동 지표 조회 */
export function getActivity(projectId) {
  return request(`/dashboard/activity/${projectId}`);
}

/** 가용시간 저장 */
export function saveAvailability(data) {
  return request("/availability", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** 가용시간 조회 */
export function getAvailability(projectId) {
  return request(`/availability/${projectId}`);
}

/** 무임승차 경고 발송 */
export function sendWarning(data) {
  return request("/send-warning", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
