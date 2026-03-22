"""Reminder_Service: 마감 임박 미완료 task 리마인드 메일 발송 (더미 데이터 + SES)"""
import boto3
import logging
from datetime import datetime, timezone, timedelta

from app.config import AWS_REGION, SES_SENDER_EMAIL
from app.services.tracker import get_active_projects

logger = logging.getLogger(__name__)
KST = timezone(timedelta(hours=9))

# 더미 task 데이터 (Notion 연결 전 임시)
DUMMY_TASKS = {
    "yujin123": [
        {"task_name": "자료조사", "deadline": "2026-03-23", "status": "진행 중"},
        {"task_name": "ppt 만들기", "deadline": "2026-03-24", "status": "시작 전"},
    ],
    "nayeon456": [
        {"task_name": "요구사항 명세서", "deadline": "2026-03-24", "status": "시작 전"},
    ],
    "minsu789": [
        {"task_name": "API 개발", "deadline": "2026-03-25", "status": "진행 중"},
    ],
    "jiho012": [
        {"task_name": "UI 디자인", "deadline": "2026-03-24", "status": "시작 전"},
    ],
}


def is_kst_noon() -> bool:
    now = datetime.now(KST)
    return now.hour == 12


def find_due_tomorrow_tasks(github_id: str) -> list[dict]:
    tomorrow = (datetime.now(KST) + timedelta(days=1)).date().isoformat()
    tasks = DUMMY_TASKS.get(github_id, [])
    return [t for t in tasks if t["deadline"] == tomorrow and t["status"] != "완료"]


def send_reminder_email(recipient_email, member_name, project_name, tasks):
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
    if not is_kst_noon():
        return {"status": "skipped", "reason": "KST 12:00이 아님"}

    projects = get_active_projects()
    total_sent = 0

    for project in projects:
        project_name = project.get("project_name", "")
        members = project.get("members", [])

        for member in members:
            github_id = member.get("github_id", "")
            email = member.get("email", "")
            name = member.get("name", "")
            if not email:
                continue
            try:
                due_tasks = find_due_tomorrow_tasks(github_id)
                if due_tasks:
                    send_reminder_email(email, name, project_name, due_tasks)
                    total_sent += 1
            except Exception as e:
                logger.error(f"리마인드 처리 실패 ({name}): {e}")
                continue

    return {"status": "ok", "emails_sent": total_sent}
