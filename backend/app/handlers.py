"""Lambda 핸들러 (Mangum으로 FastAPI → Lambda 함수 URL 변환)"""
import json
import logging
from mangum import Mangum

from app.main import app
from app.services.tracker import run_tracker
from app.services.reminder import run_reminder

logger = logging.getLogger(__name__)

# Lambda 함수 URL → FastAPI (모든 API 라우트 처리)
handler = Mangum(app, lifespan="off")


def tracker_handler(event, context):
    """Tracker_Agent Lambda 핸들러 (수동 실행 또는 테스트용)"""
    try:
        result = run_tracker()
        logger.info(f"Tracker 실행 완료: {result}")
        return {"statusCode": 200, "body": json.dumps(result)}
    except Exception as e:
        logger.error(f"Tracker 실행 실패: {e}")
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}


def reminder_handler(event, context):
    """Reminder_Service Lambda 핸들러 (수동 실행 또는 테스트용)"""
    try:
        result = run_reminder()
        logger.info(f"Reminder 실행 완료: {result}")
        return {"statusCode": 200, "body": json.dumps(result)}
    except Exception as e:
        logger.error(f"Reminder 실행 실패: {e}")
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}
