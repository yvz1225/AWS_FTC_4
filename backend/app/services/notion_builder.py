"""Notion_Builder: 승인된 Project_Spec으로 Notion 워크스페이스 자동 생성"""
import logging
import boto3
from notion_client import Client as NotionClient

from app.config import NOTION_API_KEY, NOTION_PARENT_PAGE_ID, AWS_REGION, PROJECTS_TABLE
from app.models.project_spec import ProjectSpec

logger = logging.getLogger(__name__)


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

    # 2. 팀원별 heading + 인라인 DB 생성
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

            # 인라인 DB 생성
            db = notion.databases.create(
                parent={"page_id": main_page_id},
                title=[{"type": "text", "text": {"content": f"{member.name}의 Task"}}],
                properties={
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
            )
            db_id = db["id"]
            member_db_map[member.name] = db_id
            logger.info(f"인라인 DB 생성: {member.name} -> {db_id}")

        except Exception as e:
            logger.error(f"팀원 DB 생성 실패 ({member.name}): {e}")
            continue

    # 3. 각 팀원 DB에 task 레코드 추가
    for task in spec.tasks:
        db_id = member_db_map.get(task.assignee)
        if not db_id:
            logger.warning(f"담당자 DB 없음: {task.assignee}")
            continue

        try:
            notion.pages.create(
                parent={"database_id": db_id},
                properties={
                    "Task": {"title": [{"text": {"content": task.name}}]},
                    "상태": {"select": {"name": "시작 전"}},
                    "날짜": {"date": {"start": task.deadline.isoformat()}},
                },
            )
        except Exception as e:
            logger.error(f"task 레코드 추가 실패 ({task.name}): {e}")

    # 4. projects 테이블에 프로젝트 정보 저장 (Tracker용)
    try:
        import uuid
        dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
        table = dynamodb.Table(PROJECTS_TABLE)
        project_id = str(uuid.uuid4())

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
