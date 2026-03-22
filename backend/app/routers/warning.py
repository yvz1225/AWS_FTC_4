"""Warning API: 무임승차 경고 알림 수동 발송 (SNS)"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import boto3
import logging

from app.config import AWS_REGION, SNS_TOPIC_ARN

router = APIRouter()
logger = logging.getLogger(__name__)


class WarningRequest(BaseModel):
    project_id: str
    member_name: str
    activity_estimate: float


@router.post("/send-warning")
def send_warning(req: WarningRequest):
    """무임승차 경고 SNS 알림 발송"""
    sns = boto3.client("sns", region_name=AWS_REGION)

    message = (
        f"안녕하세요, {req.member_name}님.\n\n"
        f"현재 프로젝트 활동 지표가 {req.activity_estimate}%로 "
        f"팀 평균에 비해 낮은 수준입니다.\n\n"
        f"팀 프로젝트에 더 적극적으로 참여해 주시기 바랍니다.\n\n"
        f"- Team-Up Sentinel"
    )

    try:
        sns.publish(
            TopicArn=SNS_TOPIC_ARN,
            Subject=f"[경고] 팀 프로젝트 참여도 알림 - {req.member_name}",
            Message=message,
        )
        return {"status": "sent"}
    except Exception as e:
        logger.error(f"경고 SNS 발송 실패 ({req.member_name}): {e}")
        raise HTTPException(status_code=500, detail=str(e))
