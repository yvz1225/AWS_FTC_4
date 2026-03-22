"""Validation_Service - Project_Spec 검증 로직"""
import re
import logging
from datetime import date, datetime

logger = logging.getLogger(__name__)

# 역할 정규화 매핑
ROLE_NORMALIZATION = {
    "프론트": "프론트엔드",
    "프론트엔드": "프론트엔드",
    "frontend": "프론트엔드",
    "front": "프론트엔드",
    "fe": "프론트엔드",
    "백엔드": "백엔드",
    "백": "백엔드",
    "backend": "백엔드",
    "back": "백엔드",
    "be": "백엔드",
    "디자인": "디자인",
    "디자이너": "디자인",
    "design": "디자인",
    "designer": "디자인",
    "ui": "디자인",
    "ux": "디자인",
    "ui/ux": "디자인",
    "기획": "기획",
    "기획자": "기획",
    "pm": "기획",
    "planner": "기획",
    "풀스택": "풀스택",
    "fullstack": "풀스택",
    "full-stack": "풀스택",
    "full stack": "풀스택",
    "데이터": "데이터",
    "data": "데이터",
    "ml": "데이터",
    "ai": "데이터",
}

GITHUB_ID_PATTERN = re.compile(r"^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$")
GITHUB_REPO_PATTERN = re.compile(r"^https?://github\.com/[\w\-\.]+/[\w\-\.]+/?$")
EMAIL_PATTERN = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")


def validate_spec(spec_draft: dict) -> tuple[dict | None, list[dict]]:
    """
    Project_Spec 초안을 검증하고 정제한다.
    Returns: (validated_spec, errors)
    - 성공 시: (정제된 spec dict, [])
    - 실패 시: (None, [에러 목록])
    """
    errors = []

    # --- 1. 필수 필드 존재 확인 ---
    project_info = spec_draft.get("project_info")
    if not project_info:
        errors.append({"field": "project_info", "message": "프로젝트 정보가 누락되었습니다"})
        return None, errors

    if not project_info.get("name", "").strip():
        errors.append({"field": "project_info.name", "message": "프로젝트명이 누락되었습니다"})

    members = spec_draft.get("members", [])
    if not members:
        errors.append({"field": "members", "message": "팀원 정보가 누락되었습니다"})

    tasks = spec_draft.get("tasks", [])

    if errors:
        return None, errors

    # --- 2. repo URL 검증 ---
    repo_url = str(project_info.get("repo_url", ""))
    if repo_url and not GITHUB_REPO_PATTERN.match(repo_url):
        errors.append({"field": "project_info.repo_url", "message": f"유효하지 않은 GitHub 저장소 URL: {repo_url}"})

    # --- 3. deadline 파싱 ---
    deadline_str = project_info.get("deadline", "")
    if deadline_str:
        parsed = _parse_date(deadline_str)
        if parsed is None:
            errors.append({"field": "project_info.deadline", "message": f"날짜 파싱 실패: {deadline_str}"})
        else:
            project_info["deadline"] = parsed.isoformat()

    # --- 4. 팀원 검증 + 중복 제거 + 역할 정규화 ---
    seen_emails = set()
    seen_github_ids = set()
    validated_members = []

    for i, member in enumerate(members):
        name = member.get("name", "").strip()
        role = member.get("role", "").strip()
        github_id = member.get("github_id", "").strip()
        email = member.get("email", "").strip()

        # 필수 필드
        if not name:
            errors.append({"field": f"members[{i}].name", "message": "팀원 이름이 누락되었습니다"})
            continue
        if not role:
            errors.append({"field": f"members[{i}].role", "message": f"{name}의 역할이 누락되었습니다"})
            continue

        # 이메일 검증
        if email and not EMAIL_PATTERN.match(email):
            errors.append({"field": f"members[{i}].email", "message": f"유효하지 않은 이메일 형식: {email}"})
            continue

        # GitHub ID 검증
        if github_id and not GITHUB_ID_PATTERN.match(github_id):
            errors.append({"field": f"members[{i}].github_id", "message": f"유효하지 않은 GitHub ID: {github_id}"})
            continue

        # 중복 제거
        if email.lower() in seen_emails:
            logger.info(f"중복 이메일 제거: {email}")
            continue
        if github_id.lower() in seen_github_ids:
            logger.info(f"중복 GitHub ID 제거: {github_id}")
            continue

        if email:
            seen_emails.add(email.lower())
        if github_id:
            seen_github_ids.add(github_id.lower())

        # 역할 정규화
        normalized_role = ROLE_NORMALIZATION.get(role.lower(), role)

        validated_members.append({
            "name": name,
            "role": normalized_role,
            "github_id": github_id,
            "email": email,
        })

    if not validated_members:
        errors.append({"field": "members", "message": "유효한 팀원이 없습니다"})

    # --- 5. Task 검증 + 빈 task 제거 ---
    validated_tasks = []
    for i, task in enumerate(tasks):
        task_name = task.get("name", "").strip()
        if not task_name:
            logger.info(f"빈 task 제거: index {i}")
            continue

        # task deadline 파싱
        task_deadline = task.get("deadline", "")
        if task_deadline:
            parsed = _parse_date(task_deadline)
            if parsed is None:
                errors.append({"field": f"tasks[{i}].deadline", "message": f"날짜 파싱 실패: {task_deadline}"})
                continue
            task_deadline = parsed.isoformat()

        validated_tasks.append({
            "name": task_name,
            "assignee": task.get("assignee", "").strip(),
            "deadline": task_deadline,
            "category": task.get("category", "").strip(),
        })

    if errors:
        return None, errors

    # --- 6. 정제된 spec 반환 ---
    validated_spec = {
        "project_info": {
            "name": project_info["name"].strip(),
            "repo_url": repo_url,
            "deadline": project_info.get("deadline", ""),
        },
        "members": validated_members,
        "tasks": validated_tasks,
    }

    return validated_spec, []


def _parse_date(date_str) -> date | None:
    """다양한 형식의 날짜 문자열을 파싱"""
    if isinstance(date_str, date):
        return date_str

    date_str = str(date_str).strip()
    formats = ["%Y-%m-%d", "%Y/%m/%d", "%Y.%m.%d", "%m/%d/%Y", "%d-%m-%Y"]
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    return None
