"""Notion_Builder: 승인된 Project_Spec으로 Notion 워크스페이스 자동 생성

NOTE: notion-client 3.0.0의 databases.create()가 properties를 누락하는 버그가 있어
      인라인 DB 생성과 task 레코드 추가는 httpx로 직접 Notion API를 호출합니다.
"""
import os
import logging
import uuid
import httpx
from notion_client import Client as NotionClient

from app.config import NOTION_API_KEY, NOTION_PARENT_PAGE_ID, AWS_REGION, PROJECTS_TABLE
from app.models.project_spec import ProjectSpec

USE_LOCAL = os.getenv("USE_LOCAL", "true").lower() == "true"
NOTION_API_BASE = "https://api.notion.com/v1"
NOTION_HEADERS = {
    "Authorization": f"Bearer {NOTION_API_KEY}",
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28",
}

logger = logging.getLogger(__name__)


def _notion_post(path: str, body: dict) -> dict:
    """Notion REST API POST 호출"""
    resp = httpx.post(f"{NOTION_API_BASE}{path}", headers=NOTION_HEADERS, json=body, timeout=30)
    data = resp.json()
    if resp.status_code != 200:
        raise Exception(f"Notion API 오류 ({resp.status_code}): {data.get('message', data)}")
    return data


def _notion_patch(path: str, body: dict) -> dict:
    """Notion REST API PATCH 호출"""
    resp = httpx.patch(f"{NOTION_API_BASE}{path}", headers=NOTION_HEADERS, json=body, timeout=30)
    data = resp.json()
    if resp.status_code != 200:
        raise Exception(f"Notion API 오류 ({resp.status_code}): {data.get('message', data)}")
    return data


def build_notion_workspace(spec: ProjectSpec) -> dict:
    """
    Notion 워크스페이스 생성:
    1. 프로젝트 메인 페이지
    2. 팀원별 heading + 인라인 DB
    3. 각 팀원 DB에 task 레코드 추가
    """
    notion = NotionClient(auth=NOTION_API_KEY)

    # 1. 프로젝트 메인 페이지 생성
    try:
        main_page = notion.pages.create(
            parent={"page_id": NOTION_PARENT_PAGE_ID},
            properties={
                "title": [{"text": {"content": f"🚀 {spec.project_info.name}"}}]
            },
        )
        main_page_id = main_page["id"]
        logger.info(f"메인 페이지 생성: {main_page_id}")
    except Exception as e:
        logger.error(f"메인 페이지 생성 실패: {e}")
        raise

    # repo URL 텍스트 블록 추가
    try:
        notion.blocks.children.append(
            block_id=main_page_id,
            children=[{
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{
                        "type": "text",
                        "text": {
                            "content": f"📎 Repository: {spec.project_info.repo_url}",
                            "link": {"url": str(spec.project_info.repo_url)},
                        },
                    }],
                },
            }],
        )
    except Exception as e:
        logger.warning(f"repo URL 블록 추가 실패: {e}")

    # 2. 팀원별 heading + 인라인 DB 생성 (httpx 직접 호출)
    member_db_map = {}  # {member_name: db_id}

    for member in spec.members:
        try:
            # heading_2 블록 추가
            notion.blocks.children.append(
                block_id=main_page_id,
                children=[{
                    "object": "block",
                    "type": "heading_2",
                    "heading_2": {
                        "rich_text": [{"type": "text", "text": {"content": f"👤 {member.name} ({member.role})"}}],
                    },
                }],
            )

            # 인라인 DB 생성 (httpx로 직접 호출 - notion-client 3.0 버그 우회)
            db_body = {
                "parent": {"type": "page_id", "page_id": main_page_id},
                "is_inline": True,
                "title": [{"type": "text", "text": {"content": f"{member.name}의 Task"}}],
                "properties": {
                    "Task": {"title": {}},
                    "상태": {
                        "select": {
                            "options": [
                                {"name": "시작 전", "color": "gray"},
                                {"name": "진행 중", "color": "blue"},
                                {"name": "완료", "color": "green"},
                            ]
                        }
                    },
                    "날짜": {"date": {}},
                },
            }
            db_data = _notion_post("/databases", db_body)
            db_id = db_data["id"]
            member_db_map[member.name] = db_id
            logger.info(f"인라인 DB 생성: {member.name} -> {db_id}")

        except Exception as e:
            logger.error(f"팀원 DB 생성 실패 ({member.name}): {e}")
            continue

    # 3. 각 팀원 DB에 task 레코드 추가
    def find_member_db(assignee: str) -> str | None:
        """정확 매칭 → 부분 매칭 순으로 담당자 DB 탐색"""
        if assignee in member_db_map:
            return member_db_map[assignee]
        assignee_lower = assignee.lower().strip()
        for name, db_id in member_db_map.items():
            if name.lower() in assignee_lower or assignee_lower in name.lower():
                return db_id
        return None

    def add_task_to_db(db_id: str, task_name: str, deadline_str: str):
        """httpx로 task 레코드 추가"""
        _notion_post("/pages", {
            "parent": {"database_id": db_id},
            "properties": {
                "Task": {"title": [{"text": {"content": task_name}}]},
                "상태": {"select": {"name": "시작 전"}},
                "날짜": {"date": {"start": deadline_str}},
            },
        })

    for task in spec.tasks:
        db_id = find_member_db(task.assignee)
        if not db_id:
            if task.assignee in ("전체", "all", "공통"):
                for name, mid in member_db_map.items():
                    try:
                        add_task_to_db(mid, task.name, task.deadline.isoformat())
                    except Exception as e:
                        logger.error(f"task 레코드 추가 실패 ({task.name}, {name}): {e}")
                continue
            logger.warning(f"담당자 DB 없음: {task.assignee}")
            continue

        try:
            add_task_to_db(db_id, task.name, task.deadline.isoformat())
        except Exception as e:
            logger.error(f"task 레코드 추가 실패 ({task.name}): {e}")

    # 4. projects 테이블에 프로젝트 정보 저장 (Tracker용)
    project_id = str(uuid.uuid4())
    try:
        if USE_LOCAL:
            from app.services.tracker import DUMMY_PROJECTS
            DUMMY_PROJECTS.append({
                "project_id": project_id,
                "project_name": spec.project_info.name,
                "repo_url": str(spec.project_info.repo_url),
                "active": True,
                "members": [
                    {
                        "name": m.name,
                        "role": m.role,
                        "github_id": m.github_id,
                        "email": m.email,
                        "notion_db_id": member_db_map.get(m.name, ""),
                    }
                    for m in spec.members
                ],
            })
        else:
            import boto3
            dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
            table = dynamodb.Table(PROJECTS_TABLE)
            table.put_item(
                Item={
                    "project_id": project_id,
                    "project_name": spec.project_info.name,
                    "repo_url": str(spec.project_info.repo_url),
                    "active": True,
                    "members": [
                        {
                            "name": m.name,
                            "role": m.role,
                            "github_id": m.github_id,
                            "email": m.email,
                            "notion_db_id": member_db_map.get(m.name, ""),
                        }
                        for m in spec.members
                    ],
                }
            )
    except Exception as e:
        logger.error(f"프로젝트 정보 저장 실패: {e}")

    page_url = f"https://notion.so/{main_page_id.replace('-', '')}"
    return {"status": "success", "notion_page_url": page_url, "project_id": project_id}