"""Availability API: 가용시간 저장/조회 (인메모리)"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

_availability_store: dict[str, list[dict]] = {}


class TimeSlot(BaseModel):
    day_of_week: str
    start_time: str
    end_time: str


class AvailabilityRequest(BaseModel):
    project_id: str
    member_id: str
    member_name: str = ""
    slots: list[TimeSlot]


@router.post("/availability")
def save_availability(req: AvailabilityRequest):
    try:
        key = req.project_id
        if key not in _availability_store:
            _availability_store[key] = []
        _availability_store[key] = [
            s for s in _availability_store[key] if s["member_id"] != req.member_id
        ]
        for slot in req.slots:
            _availability_store[key].append({
                "member_id": req.member_id,
                "member_name": req.member_name,
                "day_of_week": slot.day_of_week,
                "start_time": slot.start_time,
                "end_time": slot.end_time,
            })
        return {"status": "saved", "slot_count": len(req.slots)}
    except Exception as e:
        logger.error(f"가용시간 저장 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/availability/{project_id}")
def get_availability(project_id: str):
    try:
        items = _availability_store.get(project_id, [])
        grid: dict[str, dict[str, dict]] = {}
        member_ids = set()
        for item in items:
            day = item["day_of_week"]
            time = item["start_time"]
            name = item.get("member_name", item["member_id"])
            member_ids.add(item["member_id"])
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
