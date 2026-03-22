"""Validation_Service: Project_Spec 검증 로직"""
import re
import logging
from datetime import date
from pydantic import ValidationError

from app.models.project_spec import ProjectSpec, MemberSpec, TaskSpec

logger = logging.getLogger(__name__)

# 역할 정규화 매핑
ROLE_NORMALIZATION = {
    "프론트": "프론트엔드",
    "프론트엔드": "프론트엔드",
    "frontend": "프론트엔드",
    "front": "프론트엔드",
    "백엔드": "백엔드",
    "백": "백엔드",
    "backend": "백엔드",
    "back": "백엔드",
    "기획": "기획",
    "pm": "기획",
    "디자인": "디자인",
    "design": "디자인",
    "풀스택": "풀스택",
    "fullstack": "풀스택",
}

GITHUB_ID_PATTERN = re.compile(r"^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$")
GITHUB_REPO_PATTERN = re.compile(
    r"^https?://github\.com/[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+/?$"
)


def validate_github_id(github_id: str) -> bool:
    return bool(GITHUB_ID_PATTERN.match(github_id))


def validate_repo_url(url: str) -> bool:
    return bool(GITHUB_REPO_PATTERN.match(url))


def normalize_role(role: str) -> str:
    return ROLE_NORMALIZATION.get(role.lower().strip(), role.strip())


def remove_duplicate_members(members: list[dict]) -> list[dict]:
    """동일 이메일 또는 GitHub ID 기준 중복 제거"""
    seen_emails = set()
    seen_github = set()
    unique = []
    for m in members:
        email = m.get("email", "").lower()
        gid = m.get("github_id", "").lower()
        if email in seen_emails or gid in seen_github:
            continue
        seen_emails.add(email)
        seen_github.add(gid)
        unique.append(m)
    return unique


def remove_empty_tasks(tasks: list[dict]) -> list[dict]:
    """빈 task(이름 없음) 제거"""
    return [t for t in tasks if t.get("name", "").strip()]


def validate_spec(raw_spec: dict) -> dict:
    """
    Project_Spec 전체 검증.
    성공 시 {"valid": True, "spec": ProjectSpec}
    실패 시 {"valid": False, "errors": [...]}
    """
    errors = []

    # 필수 필드 확인
    if "project_info" not in raw_spec:
        errors.append({"field": "project_info", "message": "프로젝트 정보 누락"})
    if "members" not in raw_spec or not raw_spec["members"]:
        errors.append({"field": "members", "message": "팀원 정보 누락"})

    if errors:
        return {"valid": False, "errors": errors}

    pi = raw_spec["project_info"]

    # 프로젝트명 확인
    if not pi.get("name", "").strip():
        errors.append({"field": "project_info.name", "message": "프로젝트명 누락"})

    # repo URL 검증
    repo_url = str(pi.get("repo_url", ""))
    if repo_url and not validate_repo_url(repo_url):
        errors.append({"field": "project_info.repo_url", "message": "유효하지 않은 GitHub 저장소 URL"})

    # deadline 파싱
    deadline_str = pi.get("deadline", "")
    if deadline_str and isinstance(deadline_str, str):
        try:
            date.fromisoformat(deadline_str)
        except ValueError:
            errors.append({"field": "project_info.deadline", "message": "날짜 파싱 실패"})

    # 팀원 검증
    members = raw_spec.get("members", [])
    for i, m in enumerate(members):
        if not m.get("name", "").strip():
            errors.append({"field": f"members[{i}].name", "message": "팀원 이름 누락"})
        if not m.get("role", "").strip():
            errors.append({"field": f"members[{i}].role", "message": "역할 누락"})
        if m.get("github_id") and not validate_github_id(m["github_id"]):
            errors.append({"field": f"members[{i}].github_id", "message": "유효하지 않은 GitHub ID"})

    if errors:
        return {"valid": False, "errors": errors}

    # 정규화 처리
    members = remove_duplicate_members(members)
    for m in members:
        m["role"] = normalize_role(m.get("role", ""))

    tasks = remove_empty_tasks(raw_spec.get("tasks", []))

    raw_spec["members"] = members
    raw_spec["tasks"] = tasks

    # Pydantic 모델로 최종 검증
    try:
        spec = ProjectSpec(**raw_spec)
        return {"valid": True, "spec": spec}
    except ValidationError as e:
        return {"valid": False, "errors": [
            {"field": err["loc"], "message": err["msg"]}
            for err in e.errors()
        ]}
