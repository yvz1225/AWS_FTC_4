# 교수 관리 기능 설계 문서

## 1. 개요

교수가 여러 수업(Course)과 팀(Team)을 관리할 수 있는 기능.
기존 팀 단위 시스템 위에 Professor → Course → Team → Members 계층 구조를 추가한다.

```
Professor (교수)
└── Course (수업) — ex: "캡스톤디자인 2026-1학기"
    ├── Team A (팀) — ex: "Team-Up Sentinel"
    │   ├── 유진 (프론트엔드)
    │   ├── 나연 (프론트엔드)
    │   ├── 민수 (백엔드)
    │   └── 지호 (백엔드)
    ├── Team B
    │   └── ...
    └── Team C
        └── ...
```

## 2. 데이터 모델

### DynamoDB 테이블 추가

#### professors 테이블
| 속성 | 타입 | 키 |
|------|------|-----|
| professor_id | String | PK |
| name | String | |
| email | String | |
| created_at | String | |

#### courses 테이블
| 속성 | 타입 | 키 |
|------|------|-----|
| course_id | String | PK |
| professor_id | String | GSI-PK |
| name | String | |
| semester | String | |
| created_at | String | |

#### teams 테이블
| 속성 | 타입 | 키 |
|------|------|-----|
| team_id | String | PK |
| course_id | String | GSI-PK |
| team_name | String | |
| repo_url | String | |
| notion_page_url | String | |
| created_at | String | |

### 기존 테이블 변경

기존 `activity_logs`, `availability`, `conversations` 테이블에 `team_id` 필드를 추가하여
어떤 팀의 데이터인지 구분한다.

## 3. API 설계

### 교수 API

#### POST /professor/login
교수 로그인 (간단한 이메일 기반 인증)

**Request:**
```json
{
  "email": "professor@university.ac.kr",
  "name": "김교수"
}
```

**Response (200):**
```json
{
  "professor_id": "prof-uuid",
  "name": "김교수",
  "email": "professor@university.ac.kr"
}
```

#### GET /professor/{professor_id}/courses
교수의 수업 목록 조회

**Response (200):**
```json
{
  "courses": [
    {
      "course_id": "course-uuid",
      "name": "캡스톤디자인",
      "semester": "2026-1학기",
      "team_count": 5
    }
  ]
}
```

#### POST /professor/{professor_id}/courses
수업 생성

**Request:**
```json
{
  "name": "캡스톤디자인",
  "semester": "2026-1학기"
}
```

#### GET /courses/{course_id}/teams
수업 내 팀 목록 조회 (팀별 요약 포함)

**Response (200):**
```json
{
  "course_id": "course-uuid",
  "course_name": "캡스톤디자인",
  "teams": [
    {
      "team_id": "team-uuid",
      "team_name": "Team-Up Sentinel",
      "member_count": 4,
      "avg_activity": 61,
      "warning_count": 1,
      "repo_url": "https://github.com/team/project"
    }
  ]
}
```

#### GET /teams/{team_id}/summary
팀 상세 요약 (교수용 — 기존 dashboard API 확장)

**Response (200):**
```json
{
  "team_id": "team-uuid",
  "team_name": "Team-Up Sentinel",
  "members": [
    {
      "name": "유진",
      "role": "프론트엔드",
      "activity_estimate": 72,
      "activity_status": "정상"
    }
  ],
  "overall_progress": 45,
  "notion_page_url": "https://notion.so/..."
}
```

## 4. 프론트엔드 페이지

### 라우팅

| 경로 | 페이지 | 설명 |
|------|--------|------|
| /professor | ProfessorDashboard | 수업 목록 |
| /professor/course/{course_id} | CoursePage | 팀 목록 + 팀별 요약 |
| /professor/team/{team_id} | TeamDetailPage | 팀 상세 (기존 대시보드 재활용) |

### 페이지 구성

#### ProfessorDashboard (수업 목록)
```
┌─────────────────────────────────────────┐
│  교수 대시보드          [수업 추가] 버튼  │
├─────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐      │
│  │ 캡스톤디자인  │  │ SW공학      │      │
│  │ 2026-1학기   │  │ 2026-1학기   │      │
│  │ 5개 팀       │  │ 3개 팀       │      │
│  └─────────────┘  └─────────────┘      │
└─────────────────────────────────────────┘
```

#### CoursePage (팀 목록)
```
┌─────────────────────────────────────────┐
│  캡스톤디자인 2026-1학기    [← 뒤로]     │
├─────────────────────────────────────────┤
│  Team A  │ 4명 │ 평균 61% │ 경고 1명    │
│  Team B  │ 3명 │ 평균 78% │ 경고 0명    │
│  Team C  │ 5명 │ 평균 45% │ 경고 2명    │
└─────────────────────────────────────────┘
```

#### TeamDetailPage
기존 대시보드(MemberActivity, ProgressBar 등)를 재활용하여
교수가 특정 팀의 상세 활동을 볼 수 있도록 한다.

## 5. 기존 시스템과의 연결

- 학생이 채팅에서 프로젝트를 생성하면 `team_id`가 발급됨
- 교수가 수업 생성 시 초대 코드 또는 수업 코드를 발급
- 학생이 프로젝트 생성 시 수업 코드를 입력하면 해당 course에 팀이 연결됨
- 기존 activity_logs, dashboard API는 team_id 기반으로 동작하므로
  교수 페이지에서 team_id를 넘겨 기존 API를 그대로 호출 가능
