"""Chat_Agent 라우터 - POST /chat, POST /chat/retry, POST /approve"""
import logging
from fastapi import APIRouter, HTTPException

from app.models.project_spec import (
    ChatRequest, ChatResponse, RetryResponse,
    ApproveRequest, ApproveResponse,
)
from app.services.chat_agent import chat, retry, get_spec_draft
from app.services.validation import validate_spec

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def post_chat(req: ChatRequest):
    """채팅 메시지를 전송하고 Gemini 응답을 받는다"""
    try:
        result = chat(req.conversation_id, req.message)
        return ChatResponse(**result)
    except Exception as e:
        logger.error(f"Chat_Agent 오류: {e}")
        raise HTTPException(status_code=500, detail=f"Gemini API 호출 실패: {str(e)}")


@router.post("/chat/retry", response_model=RetryResponse)
def post_chat_retry():
    """새 채팅 세션을 시작한다 (재시도)"""
    try:
        result = retry()
        return RetryResponse(**result)
    except Exception as e:
        logger.error(f"Chat retry 오류: {e}")
        raise HTTPException(status_code=500, detail=f"세션 생성 실패: {str(e)}")


@router.post("/approve", response_model=ApproveResponse)
def post_approve(req: ApproveRequest):
    """Project_Spec을 승인하고 검증 후 Notion 생성을 트리거한다"""
    # 1. 대화 세션에서 spec_draft 조회
    spec_draft = get_spec_draft(req.conversation_id)
    if not spec_draft:
        raise HTTPException(
            status_code=400,
            detail="승인할 Project_Spec이 없습니다. 먼저 채팅으로 명세를 생성해주세요.",
        )

    # 2. Validation_Service로 검증
    validated_spec, errors = validate_spec(spec_draft)
    if errors:
        return ApproveResponse(status="error", errors=errors)

    # 3. Notion_Builder 호출 (TODO: notion_builder 구현 후 연결)
    try:
        # from app.services.notion_builder import build_notion
        # notion_url = build_notion(validated_spec)
        # return ApproveResponse(status="success", notion_page_url=notion_url)

        # Notion_Builder 미구현 상태 — 검증 성공 응답만 반환
        logger.info(f"검증 완료, Notion 생성 대기: {validated_spec['project_info']['name']}")
        return ApproveResponse(
            status="success",
            notion_page_url=None,
            errors=None,
        )
    except Exception as e:
        logger.error(f"Notion 생성 실패: {e}")
        raise HTTPException(status_code=500, detail=f"Notion 생성 실패: {str(e)}")
