"""Lambda 핸들러 (Mangum으로 FastAPI → Lambda 변환 + CloudWatch Events 핸들러)"""
import json
import logging
from mangum import Mangum

from app.main import app
from app.services.tracker import run_tracker
from app.services.reminder import run_reminder

logger = logging.getLogger(__name__)

# Lambda Function URL → FastAPI (모든 HTTP 요청 처리)
api_handler = Mangum(app, lifespan="off")


def handler(event, context):
    """Lambda Function URL 단일 핸들러 (모든 HTTP 요청)"""
    return api_handler(event, context)


def chat_handler(event, context):
    """Chat API Lambda 핸들러"""
    return api_handler(event, context)


def dashboard_handler(event, context):
    """Dashboard API Lambda 핸들러"""
    return api_handler(event, context)


def availability_handler(event, context):
    """Availability API Lambda 핸들러"""
    return api_handler(event, context)


def warning_handler(event, context):
    """Warning API Lambda 핸들러"""
    return api_handler(event, context)


def tracker_handler(event, context):
    """Tracker_Agent Lambda 핸들러 (CloudWatch Events 트리거)"""
    try:
        result = run_tracker()
        logger.info(f"Tracker 실행 완료: {result}")
        return {"statusCode": 200, "body": json.dumps(result)}
    except Exception as e:
        logger.error(f"Tracker 실행 실패: {e}")
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}


def reminder_handler(event, context):
    """Reminder_Service Lambda 핸들러 (CloudWatch Events 트리거)"""
    try:
        result = run_reminder()
        logger.info(f"Reminder 실행 완료: {result}")
        return {"statusCode": 200, "body": json.dumps(result)}
    except Exception as e:
        logger.error(f"Reminder 실행 실패: {e}")
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}
