# 팀플 AI Agent - Task 목록

## Phase 1. 프로젝트 초기 세팅

- [ ] GitHub 레포지토리 브랜치 전략 확정 (main / frontend / backend / design)
- [ ] 프론트엔드 React 프로젝트 초기화 (CRA 또는 Vite)
- [ ] 백엔드 FastAPI 프로젝트 초기화
- [ ] .env 환경변수 구조 정의 (Gemini, Notion, GitHub, AWS 키)
- [ ] AWS 계정 세팅 (Lambda, EventBridge, SES, DynamoDB)
- [ ] Notion Integration 생성 및 API Key 발급
- [ ] GitHub Personal Access Token 발급
- [ ] Gemini API Key 발급

---

## Phase 2. 프론트엔드 개발

### 채팅 UI
- [ ] 채팅 컴포넌트 레이아웃 구현 (좌측 패널)
- [ ] 말풍선 형태 메시지 렌더링 (사용자 / AI 구분)
- [ ] 채팅 입력창 + 전송 버튼
- [ ] retry 버튼 (새 conversation_id 발급 → 세션 초기화)
- [ ] config 버튼 (설정 패널)
- [ ] 승인 버튼 UI (명세 확정 시)
- [ ] 채팅 API 연동 (FastAPI ↔ Gemini)

### 대시보드 UI (우측 패널)
- [ ] 프로젝트 요약 카드 (AI 생성 텍스트 표시)
- [ ] Markdown 다운로드 버튼
- [ ] 전체 진행률 프로그레스 바
- [ ] 팀원 참여도 도넛 차트 (팀원별 퍼센트 + 상태 라벨)
- [ ] 경고 배너 ("경고 N명" 표시)
- [ ] 마일스톤 목록 (마일스톤명 + 마감일 + 상태)
- [ ] 무임승차 경고 팝업 (팀원명 + 참여도 + 메일 보내기 버튼)

### 시간표 UI
- [ ] when2meet 스타일 요일 × 시간대 그리드 구현
- [ ] 클릭/드래그로 시간 선택 기능
- [ ] 여러 팀원 선택 결과 합산 → 공통 가능 시간 시각화
- [ ] 팀별 회의 후보 시간 하이라이트

---

## Phase 3. 백엔드 개발

### Gemini 채팅 API
- [ ] FastAPI 채팅 엔드포인트 구현 (`POST /chat`)
- [ ] conversation_id 기반 세션 관리
- [ ] Gemini API 연동 (프로젝트 정보 → task 초안 생성)
- [ ] 채팅 히스토리 관리 (컨텍스트 유지)
- [ ] 승인 엔드포인트 구현 (`POST /approve`)

### 스키마 검증 로직
- [ ] 이메일 형식 검증
- [ ] GitHub ID 형식 검증
- [ ] 중복 팀원 제거
- [ ] deadline 파싱 실패 처리
- [ ] 누락 필드 보완 (기본값 또는 에러 반환)
- [ ] 역할 값 정규화
- [ ] 빈 task 제거
- [ ] repo URL 형식 검증

### Notion 연동
- [ ] Notion 프로젝트 메인 페이지 생성 API
- [ ] 공통 Task DB 생성 (Task, Assignee, Deadline, Status, GitHubID, Email, Category)
- [ ] 팀원별 필터 뷰 생성
- [ ] Notion DB 상태 조회 API (Status 기반 완료 판정)

### GitHub 연동
- [ ] GitHub API 연동 (커밋 내역 조회)
- [ ] 팀원별 커밋 수 집계

### 활동 지표 계산
- [ ] Notion Activity 계산 (완료 개수 + 정시 완료 보너스)
- [ ] Git Activity 계산 (커밋 개수 + 마감 전 활동 여부)
- [ ] Activity Estimate 산출 (Notion * 0.5 + Git * 0.5)
- [ ] 활동 지표 API 엔드포인트 (`GET /dashboard/activity`)

### 시간표 API
- [ ] 가용시간 저장 엔드포인트 (`POST /availability`)
- [ ] 팀 전체 가용시간 조회 엔드포인트 (`GET /availability/{project_id}`)
- [ ] 공통 가능 시간 계산 로직

---

## Phase 4. 인프라 / 자동화

### AWS Lambda + EventBridge
- [ ] Lambda 함수 작성 (1시간 주기 스케줄러)
- [ ] EventBridge 스케줄 룰 설정 (매시각 실행)
- [ ] Notion DB 조회 → 내일 마감 + 미완료 task 필터링
- [ ] 한국 시간 12:00 판정 로직

### AWS SES 메일 발송
- [ ] SES 이메일 발신자 인증
- [ ] 리마인드 메일 템플릿 작성 (프로젝트명, task명, 마감일, 현재 상태)
- [ ] 메일 발송 Lambda 연동
- [ ] 무임승차 경고 메일 수동 발송 API (`POST /send-warning`)

### DynamoDB (필요 시)
- [ ] 활동 로그 테이블 설계
- [ ] 시간표 데이터 저장 테이블 설계

---

## Phase 5. 통합 테스트 및 배포

- [ ] 채팅 → 승인 → Notion 생성 E2E 테스트
- [ ] 활동 지표 계산 정확도 검증
- [ ] 리마인드 메일 발송 테스트
- [ ] 시간표 UI 다중 사용자 테스트
- [ ] 프론트엔드 빌드 및 배포
- [ ] 백엔드 배포 (Lambda 또는 EC2/ECS)
- [ ] 최종 데모 준비
