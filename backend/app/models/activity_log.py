"""Activity Log 데이터 모델"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ActivityLog(BaseModel):
    project_id: str
    member_name: str
    github_id: str
    role: str
    git_commits: int = 0
    notion_completed: int = 0
    notion_total: int = 0
    deadline_met: bool = True
    activity_estimate: float = 0.0
    activity_status: str = "정상"  # 낮음 / 주의 / 정상
    timestamp: str = ""

    def calculate_estimate(self) -> float:
        """Activity_Estimate = Notion task 완료 비율 (0~10 스케일)"""
        if self.notion_total > 0:
            self.activity_estimate = round((self.notion_completed / self.notion_total) * 10, 2)
        else:
            self.activity_estimate = 0.0
        return self.activity_estimate

    def determine_status(self, avg_estimate: float) -> str:
        """팀 평균 대비 활동 상태 판정"""
        if avg_estimate == 0:
            self.activity_status = "정상"
        elif self.activity_estimate < avg_estimate * 0.3:
            self.activity_status = "낮음"
        elif self.activity_estimate < avg_estimate * 0.6:
            self.activity_status = "주의"
        else:
            self.activity_status = "정상"
        return self.activity_status
