"""Project_Spec Pydantic 모델"""
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
