"""Availability API: 가용시간 저장/조회"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import boto3
from boto3.dynamodb.conditions import Key
import logging

from app.config import AWS_REGION, AVAILABILITY_TABLE

router = APIRouter()
logger = logging.getLogger(__name__)


class TimeSlot(BaseModel):
    day_of_week: str
    start_time: str
    end_time: str


class AvailabilityRequest(BaseModel):
    project_id: str
    member_id: str
    member_name: str = ""
    slots: list[TimeSlot]


def get_table():
    dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
    return dynamodb.Table(AVAILABILITY_TABLE)


@router.post("/availability")
def save_availability(req: AvailabilityRequest):
    """팀원의 가용시간 저장"""
    table = get_table()
    try:
        # 기존 데이터 삭제 후 새로 저장 (전체 교체)
        existing = table.query(
            KeyConditionExpression=Key("project_id").eq(req.project_id),
        )
        # 해당 멤버의 기존 슬롯 삭제
        for item in existing.get("Items", []):
            sk = item.get("member_day_time", "")
            if sk.startswith(f"{req.member_id}#"):
                table.delete_item(
                    Key={"project_id": req.project_id, "member_day_time": sk}
                )

        # 새 슬롯 저장
        for slot in req.slots:
            sk = f"{req.member_id}#{slot.day_of_week}#{slot.start_time}"
            table.put_item(
                Item={
                    "project_id": req.project_id,
                    "member_day_time": sk,
                    "member_id": req.member_id,
                    "member_name": req.member_name,
                    "day_of_week": slot.day_of_week,
                    "start_time": slot.start_time,
                    "end_time": slot.end_time,
                }
            )

        return {"status": "saved", "slot_count": len(req.slots)}
    except Exception as e:
        logger.error(f"가용시간 저장 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/availability/{project_id}")
def get_availability(project_id: str):
    """팀 전체 가용시간 조회 (겹치는 시간 합산)"""
    table = get_table()
    try:
        resp = table.query(
            KeyConditionExpression=Key("project_id").eq(project_id),
        )
        items = resp.get("Items", [])

        # 요일별 시간대별 멤버 집계
        grid: dict[str, dict[str, list[str]]] = {}
        member_ids = set()

        for item in items:
            day = item.get("day_of_week", "")
            time = item.get("start_time", "")
            name = item.get("member_name", item.get("member_id", ""))
            member_ids.add(item.get("member_id", ""))

            if day not in grid:
                grid[day] = {}
            if time not in grid[day]:
                grid[day][time] = {"count": 0, "members": []}

            grid[day][time]["members"].append(name)
            grid[day][time]["count"] = len(grid[day][time]["members"])

        return {
            "project_id": project_id,
            "grid": grid,
            "total_members": len(member_ids),
        }
    except Exception as e:
        logger.error(f"가용시간 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))
