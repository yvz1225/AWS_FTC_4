"""Tracker_Agent: Notion 인라인 DB + GitHub 기반 활동 지표 수집"""
import logging
import httpx
from datetime import datetime, timezone, timedelta

from app.config import NOTION_API_KEY, GITHUB_TOKEN
from app.models.activity_log import ActivityLog

logger = logging.getLogger(__name__)
KST = timezone(timedelta(hours=9))

NOTION_API_BASE = "https://api.notion.com/v1"
NOTION_HEADERS = {
    "Authorization": f"Bearer {NOTION_API_KEY}",
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28",
}

# 인메모리 활동 로그 저장소
_activity_logs: list[dict] = []

# 프로젝트 저장소 (notion_builder에서 승인 시 추가됨)
DUMMY_PROJECTS = [
    {
        "project_id": "demo-project-001",
        "project_name": "Team-Up Sentinel",
        "repo_url": "https://github.com/yvz1225/AWS_FTC_4",
        "active": True,
        "members": [
            {"name": "유진", "github_id": "yujin123", "role": "프론트엔드", "email": "yujin@example.com", "notion_db_id": ""},
            {"name": "나연", "github_id": "nayeon456", "role": "백엔드", "email": "nayeon@example.com", "notion_db_id": ""},
            {"name": "민수", "github_id": "minsu789", "role": "백엔드", "email": "minsu@example.com", "notion_db_id": ""},
            {"name": "지호", "github_id": "jiho012", "role": "디자인", "email": "jiho@example.com", "notion_db_id": ""},
        ],
    }
]


def get_active_projects() -> list[dict]:
    return [p for p in DUMMY_PROJECTS if p.get("active")]


def get_activity_logs(project_id: str) -> list[dict]:
    return [log for log in _activity_logs if log["project_id"] == project_id]


def fetch_notion_completed(db_id: str) -> int:
    """Notion 인라인 DB에서 '완료' 상태인 task 수를 조회"""
    if not db_id:
        return 0
    try:
        resp = httpx.post(
            f"{NOTION_API_BASE}/databases/{db_id}/query",
            headers=NOTION_HEADERS,
            json={
                "filter": {
                    "property": "상태",
                    "select": {"equals": "완료"},
                }
            },
            timeout=15,
        )
        if resp.status_code != 200:
            logger.warning(f"Notion DB 조회 실패 ({db_id}): {resp.status_code}")
            return 0
        results = resp.json().get("results", [])
        return len(results)
    except Exception as e:
        logger.error(f"Notion 완료 task 조회 실패 ({db_id}): {e}")
        return 0


def fetch_notion_total(db_id: str) -> int:
    """Notion 인라인 DB의 전체 task 수를 조회"""
    if not db_id:
        return 0
    try:
        resp = httpx.post(
            f"{NOTION_API_BASE}/databases/{db_id}/query",
            headers=NOTION_HEADERS,
            json={},
            timeout=15,
        )
        if resp.status_code != 200:
            return 0
        return len(resp.json().get("results", []))
    except Exception as e:
        logger.error(f"Notion 전체 task 조회 실패 ({db_id}): {e}")
        return 0


def fetch_git_commits(repo_url: str, github_id: str) -> int:
    """GitHub repo에서 특정 사용자의 커밋 수 조회"""
    if not GITHUB_TOKEN or not repo_url or not github_id:
        return 0
    try:
        # repo_url에서 owner/repo 추출
        parts = repo_url.rstrip("/").split("/")
        owner, repo = parts[-2], parts[-1]
        resp = httpx.get(
            f"https://api.github.com/repos/{owner}/{repo}/commits",
            headers={
                "Authorization": f"Bearer {GITHUB_TOKEN}",
                "Accept": "application/vnd.github.v3+json",
            },
            params={"author": github_id, "per_page": 100},
            timeout=15,
        )
        if resp.status_code != 200:
            logger.warning(f"GitHub 커밋 조회 실패 ({github_id}): {resp.status_code}")
            return 0
        return len(resp.json())
    except Exception as e:
        logger.error(f"GitHub 커밋 조회 실패 ({github_id}): {e}")
        return 0


def run_tracker():
    """Tracker_Agent: Notion + GitHub에서 실시간 데이터를 수집하여 활동 지표 산출"""
    global _activity_logs
    projects = get_active_projects()

    for project in projects:
        project_id = project["project_id"]
        repo_url = project.get("repo_url", "")
        members = project.get("members", [])

        logs: list[ActivityLog] = []

        for member in members:
            notion_db_id = member.get("notion_db_id", "")
            notion_completed = fetch_notion_completed(notion_db_id)
            git_commits = fetch_git_commits(repo_url, member["github_id"])

            log = ActivityLog(
                project_id=project_id,
                member_name=member["name"],
                github_id=member["github_id"],
                role=member["role"],
                git_commits=git_commits,
                notion_completed=notion_completed,
                deadline_met=True,
            )
            log.calculate_estimate()
            logs.append(log)

        if logs:
            avg = sum(l.activity_estimate for l in logs) / len(logs)
            for log in logs:
                log.determine_status(avg)
                now = datetime.now(KST).isoformat()
                log_dict = log.model_dump()
                log_dict["timestamp"] = now
                # 기존 같은 프로젝트+멤버 로그 제거 후 최신으로 교체
                _activity_logs = [
                    l for l in _activity_logs
                    if not (l["project_id"] == project_id and l["github_id"] == log.github_id)
                ]
                _activity_logs.append(log_dict)

    return {"status": "ok", "projects_processed": len(projects)}