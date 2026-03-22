"""Dashboard API: 팀원별 활동 지표 조회"""
from fastapi import APIRouter, HTTPException
import boto3
from boto3.dynamodb.conditions import Key
import logging

from app.config import AWS_REGION, ACTIVITY_LOGS_TABLE

router = APIRouter()
logger = logging.getLogger(__name__)


def get_table():
    dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
    return dynamodb.Table(ACTIVITY_LOGS_TABLE)


@router.get("/dashboard/activity/{project_id}")
def get_activity(project_id: str):
    """팀원별 최신 활동 지표 조회"""
    table = get_table()
    try:
        resp = table.query(
            KeyConditionExpression=Key("project_id").eq(project_id),
            ScanIndexForward=False,  # 최신순
        )
        items = resp.get("Items", [])

        # 팀원별 최신 레코드만 추출
        seen = set()
        members = []
        for item in items:
            gid = item.get("github_id", "")
            if gid in seen:
                continue
            seen.add(gid)

            estimate = float(item.get("activity_estimate", 0))
            members.append({
                "name": item.get("member_name", ""),
                "github_id": gid,
                "activity_estimate": estimate,
                "activity_status": item.get("activity_status", "정상"),
                "notion_completed": int(item.get("notion_completed", 0)),
                "git_commits": int(item.get("git_commits", 0)),
                "deadline_met": item.get("deadline_met", True),
                "last_updated": item.get("timestamp_member", "").split("#")[0],
            })

        return {"project_id": project_id, "members": members}
    except Exception as e:
        logger.error(f"Dashboard 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))
