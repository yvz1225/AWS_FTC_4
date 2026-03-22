"""Chat_Agent: Gemini 기반 채팅형 명세 생성"""
import json
import uuid
import logging
import boto3
from datetime import datetime, timezone, timedelta

from google import genai

from app.config import (
    GEMINI_API_KEY, AWS_REGION, CONVERSATIONS_TABLE,
)

logger = logging.getLogger(__name__)
KST = timezone(timedelta(hours=9))

SYSTEM_PROMPT = """당신은 팀 프로젝트 명세를 도와주는 AI 어시스턴트입니다.
사용자와 대화하면서 다음 정보를 수집하세요:

1. 프로젝트명
2. 팀원 정보 (이름, 역할, GitHub ID, 이메일)
3. 저장소(repo) URL
4. 전체 마감일
5. 작업 범위 (task 목록, 각 task의 담당자, 마감일, 카테고리)

모든 정보가 수집되면 아래 JSON 형식으로 Project_Spec 초안을 생성하세요:
```json
{
  "project_info": {"name": "", "repo_url": "", "deadline": "YYYY-MM-DD"},
  "members": [{"name": "", "role": "", "github_id": "", "email": ""}],
  "tasks": [{"name": "", "assignee": "", "deadline": "YYYY-MM-DD", "category": ""}]
}
```

누락된 항목이 있으면 친절하게 추가 정보를 요청하세요.
사용자가 수정을 요청하면 반영하세요.
한국어로 대화하세요."""


def get_conversations_table():
    dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
    return dynamodb.Table(CONVERSATIONS_TABLE)


def get_conversation(conversation_id: str) -> dict | None:
    """DynamoDB에서 대화 이력 조회"""
    table = get_conversations_table()
    try:
        resp = table.get_item(Key={"conversation_id": conversation_id})
        return resp.get("Item")
    except Exception as e:
        logger.error(f"대화 조회 실패: {e}")
        return None


def save_conversation(conversation_id: str, history: list, spec_draft: dict | None, status: str = "active"):
    """대화 이력 DynamoDB에 저장"""
    table = get_conversations_table()
    table.put_item(
        Item={
            "conversation_id": conversation_id,
            "history": history,
            "spec_draft": spec_draft or {},
            "status": status,
            "updated_at": datetime.now(KST).isoformat(),
        }
    )


def extract_spec_from_response(text: str) -> dict | None:
    """Gemini 응답에서 JSON Project_Spec 추출"""
    try:
        # ```json ... ``` 블록 찾기
        if "```json" in text:
            start = text.index("```json") + 7
            end = text.index("```", start)
            json_str = text[start:end].strip()
            return json.loads(json_str)
        # { 로 시작하는 JSON 찾기
        elif "{" in text:
            start = text.index("{")
            # 마지막 } 찾기
            depth = 0
            for i in range(start, len(text)):
                if text[i] == "{":
                    depth += 1
                elif text[i] == "}":
                    depth -= 1
                    if depth == 0:
                        json_str = text[start:i + 1]
                        return json.loads(json_str)
    except (json.JSONDecodeError, ValueError):
        pass
    return None


def chat(conversation_id: str | None, message: str) -> dict:
    """채팅 메시지 처리"""
    # 새 대화 시작
    if not conversation_id:
        conversation_id = str(uuid.uuid4())

    # 기존 대화 이력 조회
    conv = get_conversation(conversation_id)
    history = conv.get("history", []) if conv else []

    # Gemini API 호출
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)

        # 대화 이력 구성
        contents = [{"role": "user", "parts": [{"text": SYSTEM_PROMPT}]}]
        for h in history:
            contents.append({
                "role": h["role"],
                "parts": [{"text": h["text"]}],
            })
        contents.append({
            "role": "user",
            "parts": [{"text": message}],
        })

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=contents,
        )
        reply = response.text

    except Exception as e:
        logger.error(f"Gemini API 호출 실패: {e}")
        raise

    # 응답에서 spec_draft 추출
    spec_draft = extract_spec_from_response(reply)

    # 대화 이력 업데이트
    history.append({"role": "user", "text": message})
    history.append({"role": "model", "text": reply})

    # DynamoDB에 저장
    save_conversation(conversation_id, history, spec_draft)

    return {
        "conversation_id": conversation_id,
        "reply": reply,
        "spec_draft": spec_draft,
    }


def retry_chat() -> dict:
    """새 채팅 세션 시작"""
    new_id = str(uuid.uuid4())
    save_conversation(new_id, [], None, status="active")
    return {"conversation_id": new_id}
