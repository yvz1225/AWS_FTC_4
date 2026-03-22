"""Dashboard API: 팀원별 활동 지표 조회 (인메모리 더미 데이터)"""
from fastapi import APIRouter, HTTPException
import logging

from app.services.tracker import get_activity_logs, run_tracker

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/dashboard/activity/{project_id}")
def get_activity(project_id: str):
    """팀원별 최신 활동 지표 조회"""
    try:
        logs = get_activity_logs(project_id)
        if not logs:
            run_tracker()
            logs = get_activity_logs(project_id)

        seen = set()
        members = []
        for log in reversed(logs):
            gid = log.get("github_id", "")
            if gid in seen:
                continue
            seen.add(gid)
            members.append({
                "name": log.get("member_name", ""),
                "github_id": gid,
                "activity_estimate": log.get("activity_estimate", 0),
                "activity_status": log.get("activity_status", "정상"),
                "notion_completed": log.get("notion_completed", 0),
                "git_commits": log.get("git_commits", 0),
                "deadline_met": log.get("deadline_met", True),
                "last_updated": log.get("timestamp", ""),
            })

        return {"project_id": project_id, "members": members}
    except Exception as e:
        logger.error(f"Dashboard 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))
