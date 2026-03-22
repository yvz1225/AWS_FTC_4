# 팀플 AI Agent (Team-Up Sentinel) - Task 목록

## 담당자 배분

| 역할 | 담당자 | 담당 영역 |
|------|--------|-----------|
| 백엔드 A | (이름) | Chat_Agent, Validation_Service, Notion_Builder |
| 백엔드 B | (이름) | Tracker_Agent, Reminder_Service, Availability API, Dashboard API, Warning API |
| 프론트 A | (이름) | 채팅 UI, 페이지 라우팅/레이아웃, API 연동 모듈 |
| 프론트 B | (이름) | 대시보드 UI, 시간표 UI |

---

## Phase 1. 프로젝트 초기 세팅 (공통)

- [ ] GitHub 레포지토리 브랜치 전략 확정 (main / frontend / backend / design) — 공통
- [ ] 프론트엔드 React + Vite 프로젝트 초기화 — 프론트 A
- [ ] 백엔드 FastAPI 프로젝트 초기화 — 백엔드 A
- [ ] .env.example 작성 — 백엔드 A
- [ ] .gitignore 설정 (.env, node_modules, __pycache__, .venv) — 백엔드 A
- [ ] AWS 계정 세팅 (Lambda, EventBridge, SES, DynamoDB, API Gateway) — 백엔드 B
- [ ] Notion Integration 생성 및 API Key 발급 — 백엔드 A
- [ ] GitHub Personal Access Token 발급 — 백엔드 B
- [ ] Gemini API Key 발급 — 백엔드 A
- [ ] DynamoDB 테이블 생성 (activity_logs, availability, conversations) — 백엔드 B
- [ ] Serverless Framework 초기 설정 (serverless.yml) — 백엔드 B

---

## Phase 2. 백엔드 개발

### 백엔드 A: Chat_Agent + Validation + Notion_Builder

#### Chat_Agent (요구사항 1, 8)
- [ ] POST /chat 엔드포인트 구현
- [ ] Gemini API 연동 (google-generativeai)
- [ ] conversation_id 기반 세션 관리 (DynamoDB conversations 테이블)
- [ ] 멀티턴 대화 히스토리 관리
- [ ] Project_Spec 초안 생성 로직 (Gemini 응답에서 JSON 추출)
- [ ] POST /chat/retry 엔드포인트 (새 Conversation_ID 발급, UI 초기화)
- [ ] Gemini API 실패 시 HTTP 500 에러 핸들링

#### Validation_Service (요구사항 2)
- [ ] Pydantic 모델 정의 (ProjectSpec, MemberSpec, TaskSpec, ProjectInfo)
- [ ] 이메일 형식 검증 (EmailStr)
- [ ] GitHub ID 형식 검증
- [ ] repo URL 형식 검증 (HttpUrl)
- [ ] 중복 팀원 제거 (동일 이메일 또는 GitHub ID)
- [ ] deadline 파싱 실패 처리
- [ ] 필수 필드 누락 시 오류 응답 (프로젝트명, 팀원 이름, 역할)
- [ ] 역할 값 정규화
- [ ] 빈 task 제거
- [ ] POST /approve 엔드포인트 (검증 → Notion_Builder 호출)

#### Notion_Builder (요구사항 3)
- [ ] Notion API 클라이언트 설정
- [ ] 프로젝트 메인 페이지 생성 (프로젝트명 + repo URL)
- [ ] 팀원별 heading_2 블록 추가
- [ ] 팀원별 인라인 DB 생성 (Task/상태/날짜 속성)
- [ ] 상태 select 옵션 설정 (시작 전/진행 중/완료)
- [ ] 각 팀원 DB에 배정된 task 레코드 추가
- [ ] 생성된 페이지 URL 반환
- [ ] Notion API 실패 시 에러 로깅 + HTTP 500
- [ ] project_info/members 누락 시 HTTP 400

### 백엔드 B: Tracker + Reminder + Availability + Dashboard + Warning

#### Tracker_Agent (요구사항 4, 6)
- [ ] EventBridge rate(1 hour) 트리거 설정
- [ ] DynamoDB에서 활성 프로젝트 목록 조회
- [ ] GitHub API 연동 (팀원별 커밋 수 수집)
- [ ] Notion API 연동 (각 팀원 인라인 DB에서 상태 수집)
- [ ] 팀원별 완료 task 수 / 마감 준수 여부 산출
- [ ] Activity_Estimate 계산 (Notion * 0.5 + Git * 0.5)
- [ ] Notion/GitHub 중 하나만 연동된 경우 해당 소스만으로 산출
- [ ] Activity_Log를 DynamoDB activity_logs 테이블에 저장
- [ ] GitHub API 또는 Notion API 실패 시 에러 로깅 + 나머지 소스 계속 수집

#### Reminder_Service (요구사항 7)
- [ ] EventBridge rate(1 hour) 트리거 설정
- [ ] 현재 시간이 KST 12:00인지 판정 로직
- [ ] 각 팀원 Notion 인라인 DB에서 내일 마감 + 미완료(상태 ≠ 완료) task 조회
- [ ] AWS SES 메일 발송 연동
- [ ] 메일 템플릿 작성 (프로젝트명, 담당 task, 마감일, 현재 상태, 리마인드 메시지)
- [ ] SES 발송 실패 시 에러 로깅 + 나머지 담당자 메일 계속 발송
- [ ] Notion API 조회 실패 시 에러 로깅 + HTTP 500

#### Availability API (요구사항 5)
- [ ] POST /availability 엔드포인트 구현 (가용시간 저장)
- [ ] GET /availability/{project_id} 엔드포인트 구현 (팀 전체 가용시간 조회)
- [ ] DynamoDB availability 테이블 저장/조회 로직
- [ ] 팀원별 슬롯 데이터 파싱 및 검증

#### Dashboard API (요구사항 6)
- [ ] GET /dashboard/activity/{project_id} 엔드포인트 구현
- [ ] DynamoDB activity_logs 테이블에서 최신 Activity_Log 조회
- [ ] 팀원별 Activity_Status (낮음/주의/정상) 판정 로직
- [ ] 응답 JSON 구성 (activity_estimate, activity_status, 퍼센트)

#### Warning API
- [ ] POST /send-warning 엔드포인트 구현
- [ ] SES를 통한 무임승차 경고 메일 발송
- [ ] 요청 파라미터 검증 (member_email, member_name, activity_estimate)

---

## Phase 3. 프론트엔드 개발

### 프론트 A: 채팅 UI + 라우팅 + API 모듈

#### 채팅 UI
- [ ] ChatPanel 컴포넌트 (말풍선 형태 메시지 목록)
- [ ] 사용자 입력창 + 전송 버튼
- [ ] retry 버튼 (POST /chat/retry 호출 → 새 세션 시작)
- [ ] config 버튼 (설정 패널 열기)
- [ ] approve 버튼 (POST /approve 호출 → Notion 생성 트리거)
- [ ] spec_draft 표시 UI (JSON → 읽기 쉬운 카드 형태)
- [ ] API 연동: POST /chat, POST /approve, POST /chat/retry

#### 페이지 라우팅 및 레이아웃
- [ ] React Router 설정 (/ → ChatPage, /schedule → SchedulePage)
- [ ] ChatPage 레이아웃 (좌측 채팅 + 우측 대시보드)
- [ ] SchedulePage 레이아웃 (시간표 그리드)
- [ ] 네비게이션 바 (페이지 간 이동)

#### API 연동 모듈
- [ ] api/chat.js (POST /chat, POST /approve, POST /chat/retry)
- [ ] api/dashboard.js (GET /dashboard/activity/{project_id})
- [ ] api/availability.js (POST /availability, GET /availability/{project_id})
- [ ] api/warning.js (POST /send-warning)
- [ ] Axios 또는 fetch 기반 공통 HTTP 클라이언트 설정 (VITE_API_URL 사용)

### 프론트 B: 대시보드 UI + 시간표 UI

#### 대시보드 UI
- [ ] ProjectSummary 컴포넌트 (AI 요약 텍스트 + Markdown 다운로드)
- [ ] ProgressBar 컴포넌트 (전체 task 완료율)
- [ ] MemberActivity 컴포넌트 (팀원별 도넛 차트 + Activity_Status 배너 + 퍼센트)
- [ ] MilestoneList 컴포넌트 (마일스톤 목록 + 상태 뱃지)
- [ ] WarningBanner 컴포넌트 (무임승차 경고 팝업 + 메일 보내기 버튼)
- [ ] API 연동: GET /dashboard/activity/{project_id}, POST /send-warning

#### 시간표 UI
- [ ] AvailabilityGrid 컴포넌트 (요일 x 시간대 그리드)
- [ ] 클릭/드래그로 시간 선택 기능
- [ ] 공통 가능 시간 하이라이트 (겹치는 팀원 수에 따라 색상 농도 차등)
- [ ] 주간 단위 표시
- [ ] API 연동: POST /availability, GET /availability/{project_id}

---

## Phase 4. 인프라 / 자동화 (백엔드 B 주도, 백엔드 A 협업)

- [ ] Serverless Framework 설정 (serverless.yml 완성) — 백엔드 B
- [ ] Lambda 함수 핸들러 작성 — 각자 담당 서비스 핸들러
  - 백엔드 A: chat_handler, notion_handler
  - 백엔드 B: tracker_handler, reminder_handler, dashboard_handler, availability_handler, warning_handler
- [ ] EventBridge 스케줄 설정 (Tracker_Agent + Reminder_Service) — 백엔드 B
- [ ] AWS SES 발신자 이메일 인증 — 백엔드 B
- [ ] API Gateway REST 엔드포인트 구성 — 백엔드 B
- [ ] DynamoDB 테이블 프로비저닝 — 백엔드 B
- [ ] Lambda 환경 변수 주입 — 백엔드 B
- [ ] CORS 설정 (프론트엔드 → API Gateway) — 백엔드 B

---

## Phase 5. 통합 테스트 및 배포

- [ ] Chat_Agent → Validation → Notion_Builder 플로우 통합 테스트 — 백엔드 A
- [ ] Tracker_Agent 수동 실행 테스트 — 백엔드 B
- [ ] Reminder_Service 수동 실행 테스트 — 백엔드 B
- [ ] 프론트엔드 ↔ 백엔드 API 연동 테스트 — 프론트 A + 백엔드 A
- [ ] 시간표 UI 저장/조회 테스트 — 프론트 B + 백엔드 B
- [ ] 대시보드 Activity_Status 표시 테스트 — 프론트 B + 백엔드 B
- [ ] 전체 시나리오 E2E 테스트 — 공통 (4명)
- [ ] 프론트엔드 빌드 및 배포 (S3 + CloudFront 또는 Vercel) — 프론트 A
- [ ] 백엔드 Serverless 배포 (sls deploy) — 백엔드 B
