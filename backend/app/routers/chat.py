"""Chat API: 채팅 + 승인 + 재시도"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging

from app.services.chat_agent import chat, retry_chat, get_conversation
from app.services.validation import validate_spec
from app.services.notion_builder import build_notion_workspace

router = APIRouter()
logger = logging.getLogger(__name__)


class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str


class ApproveRequest(BaseModel):
    conversation_id: str


@router.post("/chat")
def post_chat(req: ChatRequest):
    """채팅 메시지 전송"""
    try:
        result = chat(req.conversation_id, req.message)
        return result
    except Exception as e:
        logger.error(f"채팅 처리 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/retry")
def post_retry():
    """새 채팅 세션 시작"""
    return retry_chat()


@router.post("/approve")
def post_approve(req: ApproveRequest):
    """Project_Spec 승인 → 검증 → Notion 생성"""
    conv = get_conversation(req.conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="대화를 찾을 수 없습니다")

    spec_draft = conv.get("spec_draft")
    if not spec_draft:
        raise HTTPException(status_code=400, detail="승인할 명세 초안이 없습니다")

    # 검증
    validation_result = validate_spec(spec_draft)
    if not validation_result["valid"]:
        raise HTTPException(status_code=400, detail={
            "status": "error",
            "errors": validation_result["errors"],
        })

    # Notion 생성
    try:
        spec = validation_result["spec"]
        result = build_notion_workspace(spec)
        return result
    except Exception as e:
        logger.error(f"Notion 생성 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))
