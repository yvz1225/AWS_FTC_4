"""FastAPI 앱 엔트리포인트"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import dashboard, availability, warning

app = FastAPI(title="Team-Up Sentinel API", version="0.1.0")

# CORS 설정 (프론트엔드 → API Gateway)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 배포 시 프론트엔드 도메인으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 백엔드 B 담당 라우터
app.include_router(dashboard.router, tags=["Dashboard"])
app.include_router(availability.router, tags=["Availability"])
app.include_router(warning.router, tags=["Warning"])


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "team-up-sentinel-backend-b"}
