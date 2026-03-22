"""Warning API: 무임승차 경고 메일 수동 발송"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
import boto3
import logging

from app.config import AWS_REGION, SES_SENDER_EMAIL

router = APIRouter()
logger = logging.getLogger(__name__)


class WarningRequest(BaseModel):
    project_id: str
    member_email: EmailStr
    member_name: str
    activity_estimate: float


@router.post("/send-warning")
def send_warning(req: WarningRequest):
    """무임승차 경고 메일 발송"""
    ses = boto3.client("ses", region_name=AWS_REGION)

    body = (
        f"안녕하세요, {req.member_name}님.\n\n"
        f"현재 프로젝트 활동 지표가 {req.activity_estimate}%로 "
        f"팀 평균에 비해 낮은 수준입니다.\n\n"
        f"팀 프로젝트에 더 적극적으로 참여해 주시기 바랍니다.\n\n"
        f"- Team-Up Sentinel"
    )

    try:
        ses.send_email(
            Source=SES_SENDER_EMAIL,
            Destination={"ToAddresses": [req.member_email]},
            Message={
                "Subject": {"Data": "[경고] 팀 프로젝트 참여도 알림"},
                "Body": {"Text": {"Data": body}},
            },
        )
        return {"status": "sent"}
    except Exception as e:
        logger.error(f"경고 메일 발송 실패 ({req.member_email}): {e}")
        raise HTTPException(status_code=500, detail=str(e))
