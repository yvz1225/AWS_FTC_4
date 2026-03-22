"""Chat_Agent 서비스 - Gemini API 연동 및 대화 관리 (인메모리 저장소)"""
import json
import re
import uuid
import logging
from datetime import datetime, timezone

import google.generativeai as genai

from app.config import GEMINI_API_KEY

logger = logging.getLogger(__name__)

# Gemini 설정
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-2.0-flash")

# 인메모리 대화 저장소 (DynamoDB 연결 전 임시)
_conversations: dict[str, dict] = {}

SYSTEM_PROMPT = """너는 팀 프로젝트 협업 보조 AI야. 팀장이 프로젝트 정보를 입력하면 체계적으로 정리해서 Project_Spec을 만들어줘.

수집해야 할 정보:
- 프로젝트명
- 팀원 이름, 역할, GitHub ID, 이메일
- 저장소(repo) 주소
- 마감일
- 필요한 작업(task) 범위

대화 규칙:
1. 친절하고 자연스럽게 대화하면서 정보를 수집해.
2. 누락된 정보가 있으면 구체적으로 어떤 정보가 필요한지 물어봐.
3. 충분한 정보가 모이면 Project_Spec 초안을 JSON으로 생성해.
4. JSON을 생성할 때는 반드시 ```json 코드블록 안에 넣어줘.
5. 사용자가 수정을 요청하면 반영해서 다시 JSON을 생성해.

Project_Spec JSON 형식:
```json
{
  "project_info": {
    "name": "프로젝트명",
    "repo_url": "https://github.com/...",
    "deadline": "YYYY-MM-DD"
  },
  "members": [
    {"name": "이름", "role": "역할", "github_id": "깃허브ID", "email": "이메일"}
  ],
  "tasks": [
    {"name": "태스크명", "assignee": "담당자이름", "deadline": "YYYY-MM-DD", "category": "카테고리"}
  ]
}
```
"""


def _get_conversation(conversation_id: str) -> dict | None:
    """인메모리 저장소에서 대화 세션 조회"""
    return _conversations.get(conversation_id)


def _save_conversation(conversation: dict):
    """인메모리 저장소에 대화 세션 저장"""
    _conversations[conversation["conversation_id"]] = conversation


def _extract_spec_draft(text: str) -> dict | None:
    """Gemini 응답에서 JSON 코드블록을 추출하여 Project_Spec 초안 반환"""
    pattern = r"```json\s*([\s\S]*?)\s*```"
    match = re.search(pattern, text)
    if not match:
        return None
    try:
        return json.loads(match.group(1))
    except json.JSONDecodeError:
        logger.warning("JSON 파싱 실패, spec_draft를 None으로 반환")
        return None


def _build_gemini_history(history: list[dict]) -> list[dict]:
    """히스토리를 Gemini API 형식으로 변환"""
    gemini_history = []
    for msg in history:
        gemini_history.append({
            "role": msg["role"],
            "parts": [msg["content"]]
        })
    return gemini_history


def chat(conversation_id: str | None, message: str) -> dict:
    """채팅 메시지 처리 및 Gemini 응답 생성"""

    # 새 대화 or 기존 대화
    if not conversation_id:
        conversation_id = str(uuid.uuid4())
        conversation = {
            "conversation_id": conversation_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "history": [],
            "spec_draft": None,
            "status": "in_progress",
        }
    else:
        conversation = _get_conversation(conversation_id)
        if not conversation:
            conversation = {
                "conversation_id": conversation_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "history": [],
                "spec_draft": None,
                "status": "in_progress",
            }

    history = conversation.get("history", [])

    # Gemini 호출
    gemini_history = _build_gemini_history(history)
    chat_session = model.start_chat(history=gemini_history)

    # 첫 메시지면 시스템 프롬프트 포함
    if not history:
        full_message = f"{SYSTEM_PROMPT}\n\n사용자 메시지: {message}"
    else:
        full_message = message

    response = chat_session.send_message(full_message)
    reply = response.text

    # 히스토리 업데이트
    history.append({"role": "user", "content": message})
    history.append({"role": "model", "content": reply})

    # spec_draft 추출
    spec_draft = _extract_spec_draft(reply)
    if spec_draft:
        conversation["spec_draft"] = spec_draft

    conversation["history"] = history
    _save_conversation(conversation)

    return {
        "conversation_id": conversation_id,
        "reply": reply,
        "spec_draft": spec_draft or conversation.get("spec_draft"),
    }


def retry() -> dict:
    """새 채팅 세션 생성 (재시도)"""
    new_id = str(uuid.uuid4())
    conversation = {
        "conversation_id": new_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "history": [],
        "spec_draft": None,
        "status": "in_progress",
    }
    _save_conversation(conversation)
    return {"conversation_id": new_id}


def get_spec_draft(conversation_id: str) -> dict | None:
    """대화 세션에서 현재 spec_draft 조회"""
    conversation = _get_conversation(conversation_id)
    if not conversation:
        return None
    return conversation.get("spec_draft")
