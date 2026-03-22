"""Project_Spec 데이터 모델"""
from pydantic import BaseModel, EmailStr, HttpUrl
from datetime import date
from typing import Optional


class MemberSpec(BaseModel):
    name: str
    role: str
    github_id: str
    email: EmailStr


class TaskSpec(BaseModel):
    name: str
    assignee: str
    deadline: date
    category: str


class ProjectInfo(BaseModel):
    name: str
    repo_url: HttpUrl
    deadline: date


class ProjectSpec(BaseModel):
    project_info: ProjectInfo
    members: list[MemberSpec]
    tasks: list[TaskSpec]


class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str


class ChatResponse(BaseModel):
    conversation_id: str
    reply: str
    spec_draft: Optional[dict] = None


class RetryResponse(BaseModel):
    conversation_id: str


class ApproveRequest(BaseModel):
    conversation_id: str


class ApproveResponse(BaseModel):
    status: str
    notion_page_url: Optional[str] = None
    errors: Optional[list[dict]] = None
