"""Tracker_Agent: GitHub + Notion 활동 데이터 수집 → DynamoDB 저장"""
import boto3
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from notion_client import Client as NotionClient
from github import Github

from app.config import (
    GITHUB_TOKEN, NOTION_API_KEY, AWS_REGION,
    ACTIVITY_LOGS_TABLE, PROJECTS_TABLE,
)
from app.models.activity_log import ActivityLog

logger = logging.getLogger(__name__)
KST = timezone(timedelta(hours=9))


def get_dynamodb_table(table_name: str):
    dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
    return dynamodb.Table(table_name)


def get_active_projects() -> list[dict]:
    """DynamoDB에서 활성 프로젝트 목록 조회"""
    table = get_dynamodb_table(PROJECTS_TABLE)
    try:
        resp = table.scan(FilterExpression="active = :val", ExpressionAttributeValues={":val": True})
        return resp.get("Items", [])
    except Exception as e:
        logger.error(f"프로젝트 목록 조회 실패: {e}")
        return []


def fetch_github_commits(repo_url: str, github_id: str) -> int:
    """GitHub API로 팀원별 커밋 수 수집"""
    try:
        g = Github(GITHUB_TOKEN)
        # repo_url에서 owner/repo 추출
        parts = repo_url.rstrip("/").split("/")
        repo_name = f"{parts[-2]}/{parts[-1]}"
        repo = g.get_repo(repo_name)

        # 최근 7일간 커밋 수
        since = datetime.now(KST) - timedelta(days=7)
        commits = repo.get_commits(author=github_id, since=since)
        count = 0
        for _ in commits:
            count += 1
        return count
    except Exception as e:
        logger.error(f"GitHub 커밋 수집 실패 ({github_id}): {e}")
        return -1  # -1은 수집 실패를 의미


def fetch_notion_status(notion: NotionClient, database_id: str) -> dict:
    """Notion 인라인 DB에서 task 상태 수집"""
    try:
        results = notion.databases.query(database_id=database_id)
        total = 0
        completed = 0
        deadline_met = True

        for page in results.get("results", []):
            props = page.get("properties", {})
            total += 1

            # 상태 속성 확인
            status_prop = props.get("상태", {})
            if status_prop.get("type") == "select" and status_prop.get("select"):
                status_val = status_prop["select"].get("name", "")
                if status_val == "완료":
                    completed += 1

                    # 마감 준수 여부 확인
                    date_prop = props.get("날짜", {})
                    if date_prop.get("type") == "date" and date_prop.get("date"):
                        deadline_str = date_prop["date"].get("start", "")
                        if deadline_str:
                            deadline = datetime.fromisoformat(deadline_str).date()
                            last_edited = page.get("last_edited_time", "")
                            if last_edited:
                                edited_date = datetime.fromisoformat(
                                    last_edited.replace("Z", "+00:00")
                                ).date()
                                if edited_date > deadline:
                                    deadline_met = False

        return {
            "total": total,
            "completed": completed,
            "deadline_met": deadline_met,
        }
    except Exception as e:
        logger.error(f"Notion 상태 수집 실패 (DB: {database_id}): {e}")
        return None


def save_activity_log(log: ActivityLog):
    """Activity_Log를 DynamoDB에 저장"""
    table = get_dynamodb_table(ACTIVITY_LOGS_TABLE)
    now = datetime.now(KST).isoformat()
    table.put_item(
        Item={
            "project_id": log.project_id,
            "timestamp_member": f"{now}#{log.github_id}",
            "member_name": log.member_name,
            "github_id": log.github_id,
            "role": log.role,
            "git_commits": log.git_commits,
            "notion_completed": log.notion_completed,
            "deadline_met": log.deadline_met,
            "activity_estimate": str(log.activity_estimate),
            "activity_status": log.activity_status,
        }
    )


def run_tracker():
    """Tracker_Agent 메인 실행 로직"""
    notion = NotionClient(auth=NOTION_API_KEY)
    projects = get_active_projects()

    for project in projects:
        project_id = project["project_id"]
        repo_url = project.get("repo_url", "")
        members = project.get("members", [])

        logs: list[ActivityLog] = []

        for member in members:
            github_id = member.get("github_id", "")
            notion_db_id = member.get("notion_db_id", "")

            # GitHub 커밋 수집
            git_commits = fetch_github_commits(repo_url, github_id)
            git_failed = git_commits == -1
            if git_failed:
                git_commits = 0

            # Notion 상태 수집
            notion_data = None
            if notion_db_id:
                notion_data = fetch_notion_status(notion, notion_db_id)

            notion_completed = 0
            deadline_met = True
            if notion_data:
                notion_completed = notion_data["completed"]
                deadline_met = notion_data["deadline_met"]

            log = ActivityLog(
                project_id=project_id,
                member_name=member.get("name", ""),
                github_id=github_id,
                role=member.get("role", ""),
                git_commits=git_commits,
                notion_completed=notion_completed,
                deadline_met=deadline_met,
            )

            # Notion/GitHub 중 하나만 연동된 경우 해당 소스만으로 산출
            if git_failed and notion_data:
                log.activity_estimate = round(notion_completed * 1.0, 2)
            elif not notion_data and not git_failed:
                log.activity_estimate = round(git_commits * 1.0, 2)
            else:
                log.calculate_estimate()

            logs.append(log)

        # 팀 평균 산출 후 상태 판정
        if logs:
            avg = sum(l.activity_estimate for l in logs) / len(logs)
            for log in logs:
                log.determine_status(avg)
                save_activity_log(log)

    return {"status": "ok", "projects_processed": len(projects)}
