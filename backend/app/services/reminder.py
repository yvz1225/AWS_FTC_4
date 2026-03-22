"""Reminder_Service: 마감 임박 미완료 task 리마인드 메일 발송"""
import boto3
import logging
from datetime import datetime, timezone, timedelta

from notion_client import Client as NotionClient

from app.config import (
    NOTION_API_KEY, AWS_REGION, SES_SENDER_EMAIL, PROJECTS_TABLE,
)
from app.services.tracker import get_dynamodb_table, get_active_projects

logger = logging.getLogger(__name__)
KST = timezone(timedelta(hours=9))


def is_kst_noon() -> bool:
    """현재 시간이 KST 12:00 (11:30~12:30 범위)인지 판정"""
    now = datetime.now(KST)
    return now.hour == 12


def find_due_tomorrow_tasks(notion: NotionClient, db_id: str) -> list[dict]:
    """Notion 인라인 DB에서 내일 마감 + 미완료 task 조회"""
    tomorrow = (datetime.now(KST) + timedelta(days=1)).date().isoformat()
    try:
        results = notion.databases.query(
            database_id=db_id,
            filter={
                "and": [
                    {"property": "날짜", "date": {"equals": tomorrow}},
                    {"property": "상태", "select": {"does_not_equal": "완료"}},
                ]
            },
        )
        tasks = []
        for page in results.get("results", []):
            props = page.get("properties", {})
            title_prop = props.get("Task", {})
            task_name = ""
            if title_prop.get("type") == "title" and title_prop.get("title"):
                task_name = title_prop["title"][0].get("plain_text", "")

            status_prop = props.get("상태", {})
            status_val = ""
            if status_prop.get("select"):
                status_val = status_prop["select"].get("name", "")

            tasks.append({
                "task_name": task_name,
                "deadline": tomorrow,
                "status": status_val,
            })
        return tasks
    except Exception as e:
        logger.error(f"Notion 조회 실패 (DB: {db_id}): {e}")
        raise


def send_reminder_email(
    recipient_email: str,
    member_name: str,
    project_name: str,
    tasks: list[dict],
):
    """AWS SES로 리마인드 메일 발송"""
    ses = boto3.client("ses", region_name=AWS_REGION)

    task_lines = "\n".join(
        f"  - {t['task_name']} (마감: {t['deadline']}, 현재 상태: {t['status']})"
        for t in tasks
    )

    body = (
        f"안녕하세요, {member_name}님.\n\n"
        f"[{project_name}] 프로젝트에서 내일 마감인 미완료 task가 있습니다:\n\n"
        f"{task_lines}\n\n"
        f"마감 전에 완료 부탁드립니다.\n\n"
        f"- Team-Up Sentinel 자동 리마인드"
    )

    try:
        ses.send_email(
            Source=SES_SENDER_EMAIL,
            Destination={"ToAddresses": [recipient_email]},
            Message={
                "Subject": {"Data": f"[리마인드] {project_name} - 내일 마감 task 알림"},
                "Body": {"Text": {"Data": body}},
            },
        )
        logger.info(f"리마인드 메일 발송 완료: {recipient_email}")
    except Exception as e:
        logger.error(f"SES 메일 발송 실패 ({recipient_email}): {e}")


def run_reminder():
    """Reminder_Service 메인 실행 로직"""
    if not is_kst_noon():
        return {"status": "skipped", "reason": "KST 12:00이 아님"}

    notion = NotionClient(auth=NOTION_API_KEY)
    projects = get_active_projects()
    total_sent = 0

    for project in projects:
        project_id = project["project_id"]
        project_name = project.get("project_name", "")
        members = project.get("members", [])

        for member in members:
            notion_db_id = member.get("notion_db_id", "")
            email = member.get("email", "")
            name = member.get("name", "")

            if not notion_db_id or not email:
                continue

            try:
                due_tasks = find_due_tomorrow_tasks(notion, notion_db_id)
                if due_tasks:
                    send_reminder_email(email, name, project_name, due_tasks)
                    total_sent += 1
            except Exception as e:
                logger.error(f"리마인드 처리 실패 ({name}): {e}")
                continue

    return {"status": "ok", "emails_sent": total_sent}
