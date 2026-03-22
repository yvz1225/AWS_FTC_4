"""Tracker_Agent: 더미 데이터 기반 활동 지표 (DynamoDB/GitHub/Notion 연결 전 임시)"""
import logging
from datetime import datetime, timezone, timedelta

from app.models.activity_log import ActivityLog

logger = logging.getLogger(__name__)
KST = timezone(timedelta(hours=9))

# 인메모리 활동 로그 저장소
_activity_logs: list[dict] = []

# 더미 프로젝트 데이터
DUMMY_PROJECTS = [
    {
        "project_id": "demo-project-001",
        "project_name": "Team-Up Sentinel",
        "repo_url": "https://github.com/yvz1225/AWS_FTC_4",
        "active": True,
        "members": [
            {"name": "유진", "github_id": "yujin123", "role": "프론트엔드", "email": "yujin@example.com", "git_commits": 12, "notion_completed": 3},
            {"name": "나연", "github_id": "nayeon456", "role": "백엔드", "email": "nayeon@example.com", "git_commits": 3, "notion_completed": 1},
            {"name": "민수", "github_id": "minsu789", "role": "백엔드", "email": "minsu@example.com", "git_commits": 8, "notion_completed": 4},
            {"name": "지호", "github_id": "jiho012", "role": "디자인", "email": "jiho@example.com", "git_commits": 1, "notion_completed": 2},
        ],
    }
]


def get_active_projects() -> list[dict]:
    """더미 프로젝트 목록 반환"""
    return [p for p in DUMMY_PROJECTS if p.get("active")]


def get_activity_logs(project_id: str) -> list[dict]:
    """프로젝트의 최신 활동 로그 반환"""
    return [log for log in _activity_logs if log["project_id"] == project_id]


def run_tracker():
    """Tracker_Agent 메인 실행 로직 (더미 데이터 기반)"""
    projects = get_active_projects()

    for project in projects:
        project_id = project["project_id"]
        members = project.get("members", [])

        logs: list[ActivityLog] = []

        for member in members:
            log = ActivityLog(
                project_id=project_id,
                member_name=member["name"],
                github_id=member["github_id"],
                role=member["role"],
                git_commits=member.get("git_commits", 0),
                notion_completed=member.get("notion_completed", 0),
                deadline_met=True,
            )
            log.calculate_estimate()
            logs.append(log)

        # 팀 평균 산출 후 상태 판정
        if logs:
            avg = sum(l.activity_estimate for l in logs) / len(logs)
            for log in logs:
                log.determine_status(avg)
                now = datetime.now(KST).isoformat()
                log_dict = log.model_dump()
                log_dict["timestamp"] = now
                _activity_logs.append(log_dict)

    return {"status": "ok", "projects_processed": len(projects)}
