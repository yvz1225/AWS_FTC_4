# 팀플 AI Agent (Team-Up Sentinel) - 설계 문서

## 1. 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)               │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ 채팅 UI  │  │ 대시보드 UI  │  │ 시간표 UI (Grid)  │  │
│  └────┬─────┘  └──────┬───────┘  └────────┬──────────┘  │
└───────┼───────────────┼───────────────────┼──────────────┘
        │               │                   │
        ▼               ▼                   ▼
┌─────────────────────────────────────────────────────────┐
│                  API Gateway (REST)                      │
└───────┬───────────────┬───────────────────┬──────────────┘
        │               │                   │
        ▼               ▼                   ▼
┌──────────────┐ ┌─────────────┐ ┌────────────────────┐
│  Chat_Agent  │ │   Notion    │ │  Availability API  │
│  (Lambda)    │ │  Builder    │ │  (Lambda)           │
│              │ │  (Lambda)   │ │                     │
└──────┬───────┘ └──────┬──────┘ └─────────┬──────────┘
       │                │                   │
       ▼                ▼                   ▼
┌──────────────┐ ┌─────────────┐ ┌────────────────────┐
│  GPT API     │ │  Notion API │ │     DynamoDB       │
└──────────────┘ └─────────────┘ └────────────────────┘

┌──────────────────────────────────────────────────────┐
│              CloudWatch Events (1시간 주기)                │
│  ┌─────────────────┐    ┌──────────────────────┐     │
│  │  Tracker_Agent  │    │  Reminder_Service    │     │
│  │  (Lambda)       │    │  (Lambda)            │     │
│  └────────┬────────┘    └──────────┬───────────┘     │
│           │                        │                  │
│     ┌─────┴─────┐           ┌─────┴─────┐           │
│     ▼           ▼           ▼           ▼            │
│  GitHub API  Notion API  Notion API  AWS SES         │
│     │           │           │                        │
│     └─────┬─────┘           │                        │
│           ▼                 │                        │
│       DynamoDB              │                        │
└──────────────────────────────────────────────────────┘
```

---

## 2. 프로젝트 구조

```
/
├── frontend/                    # React (Vite) SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat/            # 채팅 UI 컴포넌트
│   │   │   ├── Dashboard/       # 대시보드 UI 컴포넌트
│   │   │   └── Schedule/        # 시간표 UI 컴포넌트
│   │   ├── pages/
│   │   │   ├── ChatPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   └── SchedulePage.jsx
│   │   ├── api/                 # API 호출 모듈
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── backend/                     # FastAPI (Python)
│   ├── app/
│   │   ├── main.py              # FastAPI 앱 엔트리
│   │   ├── routers/
│   │   │   ├── chat.py          # POST /chat, POST /approve
│   │   │   ├── dashboard.py     # GET /dashboard/activity
│   │   │   └── availability.py  # POST/GET /availability
│   │   ├── services/
│   │   │   ├── chat_agent.py     # GPT API 연동
│   │   │   ├── validation.py    # Project_Spec 검증
│   │   │   ├── notion_builder.py # Notion 페이지/DB 생성
│   │   │   ├── tracker.py       # GitHub + Notion 활동 수집
│   │   │   └── reminder.py      # 리마인드 메일 발송
│   │   ├── models/
│   │   │   ├── project_spec.py  # Pydantic 스키마
│   │   │   └── activity_log.py  # Activity Log 스키마
│   │   └── config.py            # 환경 변수 관리
│   ├── requirements.txt
│   └── serverless.yml           # Lambda 배포 설정
│
├── docs/
│   ├── requirements.md
│   ├── design.md
│   └── tasks.md
│
├── .env.example
├── .gitignore
└── README.md
```

---

## 3. API 설계

### 3.1 Chat_Agent API

#### POST /chat
채팅 메시지를 전송하고 GPT 응답을 받는다.

**Request:**
```json
{
  "conversation_id": "uuid-string",
  "message": "4명이 6주 동안 진행하는 React 기반 캡스톤"
}
```

**Response (200):**
```json
{
  "conversation_id": "uuid-string",
  "reply": "프로젝트 정보를 정리하겠습니다. 팀원 이름과 역할을 알려주세요.",
  "spec_draft": null
}
```

**Response (200, 초안 생성 시):**
```json
{
  "conversation_id": "uuid-string",
  "reply": "아래와 같이 정리했습니다. 수정할 부분이 있으면 말씀해주세요.",
  "spec_draft": {
    "project_info": {
      "name": "캡스톤 프로젝트",
      "repo_url": "https://github.com/team/project",
      "deadline": "2026-05-01"
    },
    "members": [
      {
        "name": "유진",
        "role": "프론트엔드",
        "github_id": "yujin123",
        "email": "[email]"
      }
    ],
    "tasks": [
      {
        "name": "자료조사",
        "assignee": "유진",
        "deadline": "2026-03-24",
        "category": "기획"
      }
    ]
  }
}
```

#### POST /approve
Project_Spec을 승인하고 Notion 생성을 트리거한다.

**Request:**
```json
{
  "conversation_id": "uuid-string"
}
```

**Response (200):**
```json
{
  "status": "success",
  "notion_page_url": "https://notion.so/project-page-id"
}
```

**Response (400, 검증 실패):**
```json
{
  "status": "error",
  "errors": [
    {"field": "members[0].email", "message": "유효하지 않은 이메일 형식"},
    {"field": "tasks[2].name", "message": "빈 task 이름"}
  ]
}
```

#### POST /chat/retry
새 채팅 세션을 시작한다.

**Response (200):**
```json
{
  "conversation_id": "new-uuid-string"
}
```

---

### 3.2 Dashboard API

#### GET /dashboard/activity/{project_id}
팀원별 활동 지표를 조회한다.

**Response (200):**
```json
{
  "project_id": "uuid-string",
  "members": [
    {
      "name": "유진",
      "github_id": "yujin123",
      "activity_estimate": 66,
      "activity_status": "정상",
      "notion_completed": 3,
      "git_commits": 12,
      "last_updated": "2026-03-22T15:00:00+09:00"
    },
    {
      "name": "나연",
      "github_id": "nayeon456",
      "activity_estimate": 44,
      "activity_status": "낮음",
      "notion_completed": 1,
      "git_commits": 3,
      "last_updated": "2026-03-22T15:00:00+09:00"
    }
  ]
}
```

---

### 3.3 Availability API

#### POST /availability
팀원의 가용시간을 저장한다.

**Request:**
```json
{
  "project_id": "uuid-string",
  "member_id": "uuid-string",
  "slots": [
    {"day_of_week": "mon", "start_time": "09:00", "end_time": "09:30"},
    {"day_of_week": "mon", "start_time": "09:30", "end_time": "10:00"},
    {"day_of_week": "wed", "start_time": "14:00", "end_time": "14:30"}
  ]
}
```

**Response (200):**
```json
{
  "status": "saved",
  "slot_count": 3
}
```

#### GET /availability/{project_id}
팀 전체 가용시간을 조회한다.

**Response (200):**
```json
{
  "project_id": "uuid-string",
  "grid": {
    "mon": {
      "09:00": {"count": 3, "members": ["유진", "나연", "민수"]},
      "09:30": {"count": 2, "members": ["유진", "나연"]},
      "10:00": {"count": 1, "members": ["유진"]}
    },
    "wed": {
      "14:00": {"count": 4, "members": ["유진", "나연", "민수", "지호"]}
    }
  },
  "total_members": 4
}
```

#### POST /send-warning
무임승차 경고 메일을 수동 발송한다.

**Request:**
```json
{
  "project_id": "uuid-string",
  "member_email": "[email]",
  "member_name": "나연",
  "activity_estimate": 44
}
```

**Response (200):**
```json
{
  "status": "sent"
}
```

---

## 4. 데이터 모델

### 4.1 Project_Spec (Pydantic)

```python
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
```

### 4.2 DynamoDB - Activity Log

**테이블명:** `activity_logs`

| 속성 | 타입 | 키 |
|------|------|-----|
| project_id | String | PK |
| timestamp#member_id | String | SK |
| member_name | String | |
| github_id | String | |
| role | String | |
| git_commits | Number | |
| notion_completed | Number | |
| deadline_met | Boolean | |
| activity_estimate | Number | |
| activity_status | String | |

### 4.3 DynamoDB - Availability

**테이블명:** `availability`

| 속성 | 타입 | 키 |
|------|------|-----|
| project_id | String | PK |
| member_id#day#time | String | SK |
| member_name | String | |
| day_of_week | String | |
| start_time | String | |
| end_time | String | |

### 4.4 DynamoDB - Conversations

**테이블명:** `conversations`

| 속성 | 타입 | 키 |
|------|------|-----|
| conversation_id | String | PK |
| created_at | String | SK |
| project_id | String | |
| history | List | |
| spec_draft | Map | |
| status | String | |

---

## 5. Notion 생성 구조

Notion_Builder가 생성하는 페이지 구조:

```
프로젝트 메인 페이지 (page)
├── 프로젝트명 (title)
├── repo URL (text block)
│
├── "유진" (heading_2 block)
├── [유진의 인라인 DB] (child_database)
│   ├── 속성: Task(title), 상태(select), 날짜(date)
│   ├── 자료조사 | 완료 | 2026-03-23
│   └── ppt 만들기 | 시작 전 | 2026-03-24
│
├── "나연" (heading_2 block)
├── [나연의 인라인 DB] (child_database)
│   ├── 속성: Task(title), 상태(select), 날짜(date)
│   ├── 요구사항 명세서 만들기 | 시작 전 | 2026-03-24
│   └── 데이터 수집 | 시작 전 | 2026-03-26
│
├── "민수" (heading_2 block)
├── [민수의 인라인 DB] (child_database)
│   └── ...
```

**상태 select 옵션:**
- 시작 전 (회색)
- 진행 중 (파란색)
- 완료 (초록색)

**Notion API 호출 순서:**
1. `POST /v1/pages` - 프로젝트 메인 페이지 생성
2. 각 팀원에 대해 반복:
   a. `PATCH /v1/blocks/{page_id}/children` - heading_2 블록 추가
   b. `POST /v1/databases` - 인라인 DB 생성 (parent: page_id)
   c. `POST /v1/pages` - 각 task를 DB 레코드로 추가

---

## 6. Lambda 함수 설계

### 6.1 Chat_Agent Lambda
- **트리거:** API Gateway POST /chat, /approve, /chat/retry
- **런타임:** Python 3.12
- **환경 변수:** OPENAI_API_KEY
- **로직:**
  1. conversation_id로 DynamoDB에서 대화 이력 조회
  2. 사용자 메시지 + 이력을 GPT API에 전달
  3. 응답에서 Project_Spec 초안 추출 (있으면)
  4. 대화 이력 + 초안을 DynamoDB에 저장
  5. 응답 반환

### 6.2 Notion_Builder Lambda
- **트리거:** Chat_Agent에서 내부 호출 (approve 시)
- **런타임:** Python 3.12
- **환경 변수:** NOTION_API_KEY, NOTION_PARENT_DB_ID
- **로직:**
  1. Validation_Service로 Project_Spec 검증
  2. 검증 통과 시 Notion API 호출
  3. 메인 페이지 생성 -> 팀원별 heading + 인라인 DB 생성 -> task 레코드 추가
  4. 생성된 페이지 URL 반환

### 6.3 Tracker_Agent Lambda
- **트리거:** CloudWatch Events rate(1 hour)
- **런타임:** Python 3.12
- **환경 변수:** GITHUB_TOKEN, NOTION_API_KEY
- **로직:**
  1. DynamoDB에서 활성 프로젝트 목록 조회
  2. 각 프로젝트의 팀원별 Notion 인라인 DB에서 상태 수집
  3. GitHub API로 팀원별 커밋 수 수집
  4. Activity_Estimate 계산
  5. Activity_Log를 DynamoDB에 저장

### 6.4 Reminder_Service Lambda
- **트리거:** CloudWatch Events rate(1 hour)
- **런타임:** Python 3.12
- **환경 변수:** NOTION_API_KEY, SES 설정
- **로직:**
  1. 현재 시간이 KST 12:00인지 확인
  2. 12:00이 아니면 즉시 종료
  3. 각 팀원의 Notion 인라인 DB에서 내일 마감 + 미완료 task 조회
  4. 해당 담당자에게 SES로 리마인드 메일 발송

---

## 7. 프론트엔드 컴포넌트 설계

### 7.1 페이지 라우팅

| 경로 | 페이지 | 설명 |
|------|--------|------|
| / | ChatPage | 채팅 + 대시보드 메인 화면 |
| /schedule | SchedulePage | 시간표 UI |

### 7.2 ChatPage 레이아웃

```
┌─────────────────────────────────────────────────────┐
│              무임승차 경고 배너 (조건부)               │
├──────────────┬──────────────────────────────────────┤
│              │  프로젝트 요약 카드                    │
│              │  [Markdown 다운로드]                   │
│              ├──────────────────────────────────────┤
│   채팅 패널   │  전체 진행률 프로그레스 바              │
│              ├────────────────┬─────────────────────┤
│  [입력창]     │  팀원 참여도    │  마일스톤 목록       │
│  [retry]     │  (도넛 차트)    │  (상태 뱃지)        │
│  [config]    │  경고 N명       │                     │
└──────────────┴────────────────┴─────────────────────┘
```

### 7.3 주요 컴포넌트

| 컴포넌트 | 설명 |
|----------|------|
| ChatPanel | 채팅 말풍선, 입력창, 전송/retry/config 버튼 |
| ProjectSummary | AI 요약 텍스트 + Markdown 다운로드 |
| ProgressBar | 전체 task 완료율 프로그레스 바 |
| MemberActivity | 팀원별 도넛 차트 + Activity_Status 배너 |
| MilestoneList | 마일스톤 목록 + 상태 뱃지 |
| WarningBanner | 무임승차 경고 팝업 + 메일 보내기 버튼 |
| AvailabilityGrid | 요일 x 시간대 그리드 + 드래그 선택 |
| ApproveButton | 명세 승인 버튼 |

---

## 8. 환경 변수

```env
# .env.example

# OpenAI (GPT)
OPENAI_API_KEY=your_openai_api_key

# Notion
NOTION_API_KEY=your_notion_integration_secret
NOTION_PARENT_PAGE_ID=your_notion_parent_page_id

# GitHub
GITHUB_TOKEN=your_github_personal_access_token

# AWS
AWS_REGION=us-east-1

# Frontend
VITE_API_URL=https://your-api-gateway-id.execute-api.us-east-1.amazonaws.com
```

---

## 9. 배포 구성 (Serverless Framework)

```yaml
service: team-up-sentinel

provider:
  name: aws
  runtime: python3.12
  region: us-east-1
  environment:
    OPENAI_API_KEY: ${env:OPENAI_API_KEY}
    NOTION_API_KEY: ${env:NOTION_API_KEY}
    NOTION_PARENT_PAGE_ID: ${env:NOTION_PARENT_PAGE_ID}
    GITHUB_TOKEN: ${env:GITHUB_TOKEN}

functions:
  chatAgent:
    handler: app.handlers.chat_handler
    events:
      - httpApi:
          path: /chat
          method: post
      - httpApi:
          path: /approve
          method: post
      - httpApi:
          path: /chat/retry
          method: post

  notionBuilder:
    handler: app.handlers.notion_handler

  trackerAgent:
    handler: app.handlers.tracker_handler
    events:
      - schedule: rate(1 hour)

  reminderService:
    handler: app.handlers.reminder_handler
    events:
      - schedule: rate(1 hour)

  dashboardApi:
    handler: app.handlers.dashboard_handler
    events:
      - httpApi:
          path: /dashboard/activity/{project_id}
          method: get

  availabilityApi:
    handler: app.handlers.availability_handler
    events:
      - httpApi:
          path: /availability
          method: post
      - httpApi:
          path: /availability/{project_id}
          method: get

  warningApi:
    handler: app.handlers.warning_handler
    events:
      - httpApi:
          path: /send-warning
          method: post

resources:
  Resources:
    ActivityLogsTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: activity_logs
        AttributeDefinitions:
          - AttributeName: project_id
            AttributeType: S
          - AttributeName: timestamp_member
            AttributeType: S
        KeySchema:
          - AttributeName: project_id
            KeyType: HASH
          - AttributeName: timestamp_member
            KeyType: RANGE

    AvailabilityTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: availability
        AttributeDefinitions:
          - AttributeName: project_id
            AttributeType: S
          - AttributeName: member_day_time
            AttributeType: S
        KeySchema:
          - AttributeName: project_id
            KeyType: HASH
          - AttributeName: member_day_time
            KeyType: RANGE

    ConversationsTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: conversations
        AttributeDefinitions:
          - AttributeName: conversation_id
            AttributeType: S
        KeySchema:
          - AttributeName: conversation_id
            KeyType: HASH
```
