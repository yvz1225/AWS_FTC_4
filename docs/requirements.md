# 팀플 AI Agent (Team-Up Sentinel) - 요구사항 명세서 (MVP)

## 1. 소개

Team-Up Sentinel은 팀 프로젝트 진행 과정에서 역할 분담, 일정 조율, 업무 추적, 활동 모니터링, 리마인드 메일 발송을 지원하는 협업 보조 서비스이다.

Gemini 기반 채팅형 명세 생성, Notion 자동 구축, GitHub/Notion 기반 활동 지표 수집, 자동 리마인드 메일 발송, when2meet 스타일 가용시간 조율 UI, 팀원별 활동 대시보드를 제공한다.

프론트엔드는 React(Vite), 백엔드는 FastAPI(Python), 인프라는 AWS Lambda, CloudWatch Events, SES, DynamoDB를 사용한다.

### 해결하고자 하는 문제

- 팀원별 역할 분담이 애매한 문제
- 해야 할 일을 체계적으로 정리하기 어려운 문제
- 누가 얼마나 참여하고 있는지 파악하기 어려운 문제
- 마감 직전까지 업무가 방치되는 문제
- 팀 프로젝트 운영 툴이 흩어져 있는 문제

---

## 2. 용어 사전

- **Chat_Agent**: Google Gemini API를 활용하여 사용자와 대화형 인터페이스로 프로젝트 명세 정보를 수집하고, 초안을 생성/수정하며, 승인 시 백엔드 검증을 거쳐 Notion 자동 생성을 트리거하는 백엔드 서비스
- **Project_Spec**: Chat_Agent가 생성하는 JSON 형식의 프로젝트 설정 데이터로, project_info(프로젝트명, repo URL, 마감일), members(이름, 역할, GitHub ID, 이메일), tasks(Task명, 담당자, 마감일, 카테고리) 필드를 포함한다
- **Notion_Builder**: 승인된 Project_Spec을 입력받아 Notion API를 호출하여 프로젝트 메인 페이지와 팀원별 인라인 DB를 자동 생성하는 백엔드 서비스
- **Task_DB**: Notion 프로젝트 페이지 내에 팀원별로 생성되는 인라인 데이터베이스로, Task(이름), 상태(시작 전/진행 중/완료), 날짜(Deadline) 속성을 포함한다
- **Tracker_Agent**: CloudWatch Events 스케줄(1시간 주기)에 의해 트리거되어 GitHub API와 Notion API로부터 팀원별 활동 데이터를 수집하고 DynamoDB에 저장하는 Lambda 함수
- **Activity_Estimate**: 팀원의 활동 수준을 나타내는 참고용 지표로, Notion 완료 태스크 점수를 기반으로 산출한다. GitHub 커밋 횟수는 기여도 산정에 포함하지 않으며, 대시보드에서 참여 지표로 별도 표시한다
- **Activity_Status**: 팀원의 활동 수준을 3단계로 분류한 배너 상태 (낮음 / 주의 / 정상)
- **Reminder_Service**: CloudWatch Events + Lambda로 1시간마다 실행되어, 내일 마감이면서 미완료(상태가 완료가 아닌) Task를 조회하고, 한국 시간 기준 12:00에 담당자에게 AWS SES를 통해 리마인드 메일을 발송하는 서비스
- **Availability_Grid**: when2meet 스타일의 주간 단위 시간표(요일 x 시간대 그리드)로, 팀원이 가능한 시간을 클릭/드래그로 선택하는 UI 컴포넌트
- **Validation_Service**: 승인된 Project_Spec에 대해 이메일 형식, GitHub ID 형식, repo URL 형식 검증, 중복 팀원 제거, deadline 파싱, 누락 필드 보완, 역할 값 정규화, 빈 task 제거를 수행하는 백엔드 검증 로직
- **Dashboard**: 팀원별 Activity_Status 배너(낮음 / 주의 / 정상)를 퍼센트와 함께 표시하는 프론트엔드 화면
- **DynamoDB_Table**: Activity Log를 저장하는 AWS DynamoDB 테이블
- **SES**: AWS Simple Email Service, 리마인드 메일 및 경고 메일 발송에 사용되는 이메일 서비스
- **Conversation_ID**: 채팅 세션을 식별하는 고유 ID로, 재시도 시 새로 생성된다

---

## 3. 요구사항

### 요구사항 1: Gemini 기반 채팅형 명세 생성

**사용자 스토리:** 팀장으로서, 채팅 인터페이스를 통해 프로젝트 명세를 대화형으로 작성하고 싶다. 이를 통해 팀 구성, 역할 분담, 작업 범위를 체계적으로 정리할 수 있다.

**채팅창에서 수집하는 정보:**
- 프로젝트명, 팀원 이름, 팀원 역할, GitHub ID, 이메일, 저장소(repo) 주소, 마감일, 필요한 작업 범위

#### 인수 조건

1. WHEN 사용자가 메시지를 전송하면, THE Chat_Agent SHALL Google Gemini API를 호출하여 대화 맥락을 유지한 응답을 생성한다
2. WHEN 사용자가 프로젝트 정보를 제공하면, THE Chat_Agent SHALL 프로젝트명, 팀원 이름, 역할, GitHub ID, 이메일, repo 주소, 마감일, 작업 범위를 수집한다
3. WHEN 필수 항목이 누락된 경우, THE Chat_Agent SHALL 누락된 항목을 명시하여 추가 정보를 요청하는 응답을 생성한다
4. WHEN 수집이 완료되면, THE Chat_Agent SHALL Project_Spec 초안을 생성하여 사용자에게 제시한다
5. WHEN 사용자가 수정을 요청하면, THE Chat_Agent SHALL 요청 사항을 반영하여 Project_Spec 초안을 갱신한다
6. WHEN 사용자가 승인 의사를 표시하면, THE Chat_Agent SHALL 확정된 Project_Spec을 Validation_Service에 전달한다
7. THE Chat_Agent SHALL 이전 대화 내역(history)을 포함하여 Gemini API에 전달함으로써 멀티턴 대화 맥락을 유지한다
8. IF Gemini API 호출이 실패하면, THEN THE Chat_Agent SHALL HTTP 500 상태 코드와 에러 메시지를 반환한다

---

### 요구사항 2: 백엔드 검증 로직

**사용자 스토리:** 팀장으로서, 승인한 명세가 Notion에 반영되기 전에 데이터 무결성이 검증되기를 원한다. 이를 통해 잘못된 데이터로 인한 오류를 사전에 방지할 수 있다.

#### 인수 조건

1. WHEN Project_Spec을 수신하면, THE Validation_Service SHALL 각 팀원의 이메일 주소가 유효한 이메일 형식인지 검증한다
2. WHEN Project_Spec을 수신하면, THE Validation_Service SHALL 각 팀원의 GitHub ID가 유효한 형식인지 검증한다
3. WHEN Project_Spec을 수신하면, THE Validation_Service SHALL repo URL이 유효한 GitHub 저장소 URL 형식인지 검증한다
4. WHEN 중복된 팀원(동일 이메일 또는 동일 GitHub ID)이 존재하면, THE Validation_Service SHALL 중복 항목을 제거하고 하나만 유지한다
5. WHEN deadline 문자열의 날짜 파싱이 실패하면, THE Validation_Service SHALL 해당 필드를 오류로 표시하고 사용자에게 수정을 요청한다
6. WHEN 필수 필드(프로젝트명, 팀원 이름, 역할)가 누락되면, THE Validation_Service SHALL 누락된 필드 목록을 포함한 오류 응답을 반환한다
7. WHEN 역할 값이 비정규화된 형태이면, THE Validation_Service SHALL 역할 값을 정규화된 형태로 변환한다
8. WHEN task 목록에 빈 task(이름 없음)가 존재하면, THE Validation_Service SHALL 빈 task를 제거한다
9. WHEN 모든 검증을 통과하면, THE Validation_Service SHALL 검증 완료된 Project_Spec을 Notion_Builder에 전달한다
10. FOR ALL 유효한 Project_Spec 객체에 대해, 검증 후 직렬화한 뒤 다시 파싱하면 동일한 객체가 생성된다 (라운드트립 속성)

---

### 요구사항 3: 승인 후 Notion 자동 생성

**사용자 스토리:** 팀장으로서, 확정된 명세를 기반으로 Notion 워크스페이스가 자동 생성되기를 원한다. 이를 통해 수동 설정 없이 협업 인프라를 즉시 사용할 수 있다.

**승인 후 생성되는 Notion 구조:**

1. **프로젝트 메인 페이지** - 프로젝트명, repo URL, 전체 진행 현황
2. **팀원별 인라인 DB** - 한 페이지 안에 팀원 이름을 heading으로, 그 아래에 인라인 데이터베이스를 팀원 수만큼 생성
   - 각 DB 속성: Task(이름), 상태(시작 전/진행 중/완료), 날짜(Deadline)
   - 해당 팀원에게 배정된 task만 각자의 DB에 레코드로 추가

#### 인수 조건

1. WHEN 검증 완료된 Project_Spec을 수신하면, THE Notion_Builder SHALL Notion API를 호출하여 프로젝트명과 repo URL이 포함된 프로젝트 메인 페이지를 생성한다
2. WHEN 메인 페이지가 생성되면, THE Notion_Builder SHALL members 배열의 각 팀원에 대해 팀원 이름을 heading으로, 그 아래에 Task(title), 상태(select: 시작 전/진행 중/완료), 날짜(date) 속성을 가진 인라인 데이터베이스를 생성한다
3. WHEN 팀원별 인라인 DB가 생성되면, THE Notion_Builder SHALL 해당 팀원에게 배정된 task를 각자의 DB에 레코드로 추가한다
4. WHEN 모든 Notion 리소스 생성이 완료되면, THE Notion_Builder SHALL 메인 페이지 URL을 포함하는 HTTP 200 응답을 반환한다
5. IF Project_Spec에 project_info 또는 members 필드가 누락되면, THEN THE Notion_Builder SHALL Invalid Specification 에러 메시지와 함께 HTTP 400 응답을 반환한다
6. IF Notion API 호출이 실패하면, THEN THE Notion_Builder SHALL 에러 메시지를 로깅하고 HTTP 500 응답을 반환한다

---

### 요구사항 4: Notion 연동 기반 상태 관리

**사용자 스토리:** 팀원으로서, Notion Task DB의 상태 속성을 통해 업무 완료 여부를 관리하고 싶다. 이를 통해 별도 도구 없이 Notion에서 직접 상태를 업데이트할 수 있다.

**핵심 원칙:**
- 체크리스트 자동 생성까지만 Notion API 사용
- 완료 여부는 상태 속성으로 관리 (버튼 기반 완료 보고는 사용하지 않음)
- 백엔드가 주기적으로 각 팀원의 Notion 인라인 DB를 조회해서 상태 수집
- 마감 리마인드 / 활동 집계는 백엔드가 담당

#### 인수 조건

1. THE Task_DB SHALL 각 task의 상태 속성을 통해 업무 진행 상태를 관리한다
2. WHEN 상태 값이 완료이면, THE System SHALL 해당 task를 완료로 판정한다
3. THE Tracker_Agent SHALL 주기적으로 각 팀원의 Notion 인라인 DB를 조회하여 각 task의 상태 값을 수집한다
4. WHEN Tracker_Agent가 상태를 수집하면, THE Tracker_Agent SHALL 팀원별 완료 task 수와 마감 준수 여부를 산출한다

---

### 요구사항 5: when2meet 스타일 가용시간 입력 UI

**사용자 스토리:** 팀원으로서, 주간 단위 시간표에서 가능한 시간을 클릭/드래그로 선택하고 싶다. 이를 통해 팀 전체의 공통 가능 시간을 쉽게 파악할 수 있다.

**저장 데이터:**

| 필드 | 설명 |
|------|------|
| project_id | 프로젝트 식별자 |
| member_id | 팀원 식별자 |
| day_of_week | 요일 |
| start_time | 시작 시간 |
| end_time | 종료 시간 |
| availability_status | 가용 상태 |

#### 인수 조건

1. THE Availability_Grid SHALL 요일(월~일) x 시간대(30분 단위) 그리드를 표시한다
2. WHEN 팀원이 그리드 셀을 클릭하거나 드래그하면, THE Availability_Grid SHALL 해당 시간대를 선택 상태로 토글한다
3. WHEN 팀원이 가용시간 선택을 완료하면, THE Availability_Grid SHALL project_id, member_id, day_of_week, start_time, end_time, availability_status를 백엔드에 저장한다
4. WHEN 여러 팀원의 가용시간 데이터가 존재하면, THE Availability_Grid SHALL 팀원들의 선택 결과를 합산하여 공통 가능 시간을 시각적으로 구분하여 표시한다
5. WHEN 공통 가능 시간을 표시할 때, THE Availability_Grid SHALL 겹치는 팀원 수에 따라 색상 농도를 다르게 표현한다
6. THE Availability_Grid SHALL 주간 단위로 시간표를 표시한다

---

### 요구사항 6: 팀원별 활동 지표 수집 및 대시보드

**사용자 스토리:** 팀장으로서, 팀원별 활동 지표를 대시보드에서 한눈에 확인하고 싶다. 이를 통해 프로젝트 진행 상황과 팀원 참여도를 파악할 수 있다.

**활동 지표 산정:**

```
Activity Estimate = Notion 완료 개수 + 정시 완료 보너스
```

> 이 수치는 절대적인 평가값이 아니라, 협업 상태를 참고하기 위한 활동 지표로 사용합니다.
> GitHub 커밋 횟수는 기여도 산정에 포함하지 않으며, 대시보드에서 참여 참고 지표로만 작게 표시합니다.

**대시보드 표시 항목:**
- 활동 상태 배너: 기여도 낮음 / 주의 / 정상 (퍼센트 표시)
- 팀원별 커밋 횟수: 기여도 요소 아래에 참고용으로 작게 표시

#### 인수 조건

1. THE Tracker_Agent SHALL CloudWatch Events 스케줄에 의해 1시간 주기로 자동 실행된다
2. WHEN 실행되면, THE Tracker_Agent SHALL GitHub API를 호출하여 등록된 팀원별 커밋 횟수를 수집한다 (대시보드 참고 지표용)
3. WHEN 실행되면, THE Tracker_Agent SHALL Notion API를 호출하여 각 팀원의 인라인 DB에서 체크리스트 완료 개수와 마감 준수 여부를 수집한다
4. WHEN GitHub 및 Notion 데이터 수집이 완료되면, THE Tracker_Agent SHALL 팀원 이름, GitHub ID, 커밋 수, Notion 완료 태스크 수, 마감 준수 여부, 타임스탬프를 포함하는 Activity_Log를 DynamoDB_Table에 저장한다
5. THE Tracker_Agent SHALL Activity_Estimate를 Notion 완료 태스크 데이터만으로 산출한다 (GitHub 커밋 수는 기여도 산정에 포함하지 않음)
6. WHEN Activity_Estimate를 산출하면, THE Dashboard SHALL 각 팀원에 대해 Activity_Status 배너(낮음 / 주의 / 정상)를 퍼센트와 함께 표시한다
7. THE Dashboard SHALL 각 팀원의 기여도 요소 아래에 GitHub 커밋 횟수를 참고 지표로 작게 표시한다
8. THE Dashboard SHALL Activity_Estimate가 절대적 평가값이 아닌 참고용 지표임을 명시한다
9. IF GitHub API 또는 Notion API 호출이 실패하면, THEN THE Tracker_Agent SHALL 에러를 로깅하고 실패한 소스를 건너뛴 채 나머지 데이터를 수집한다

---

### 요구사항 7: Task별 Deadline 자동 리마인드 메일 발송

**사용자 스토리:** 팀원으로서, 마감이 임박한 미완료 task에 대해 자동으로 리마인드 메일을 받고 싶다. 이를 통해 마감 직전까지 업무가 방치되는 것을 방지할 수 있다.

#### 인수 조건

1. THE Reminder_Service SHALL CloudWatch Events 스케줄에 의해 1시간 주기로 Lambda를 실행한다
2. WHEN Lambda가 실행되면, THE Reminder_Service SHALL 각 팀원의 Notion 인라인 DB에서 마감일이 내일이면서 상태가 완료가 아닌 task를 조회한다
3. WHEN 한국 시간(KST) 기준 12:00이면, THE Reminder_Service SHALL 조회된 미완료 task의 담당자에게 AWS SES를 통해 리마인드 메일을 발송한다
4. WHEN 리마인드 메일을 발송할 때, THE Reminder_Service SHALL 프로젝트명, 담당 task 이름, 마감일, 현재 상태, 리마인드 메시지를 메일 본문에 포함한다
5. IF SES 메일 발송이 실패하면, THEN THE Reminder_Service SHALL 에러를 로깅하고 나머지 담당자에 대한 메일 발송을 계속 진행한다
6. IF Notion API 조회가 실패하면, THEN THE Reminder_Service SHALL 에러를 로깅하고 HTTP 500 응답을 반환한다

---

### 요구사항 8: 채팅 재시도 기능

**사용자 스토리:** 팀장으로서, 채팅 중 처음부터 다시 시작하고 싶을 때 재시도 버튼을 눌러 새 채팅을 시작하고 싶다. 이를 통해 잘못된 입력을 쉽게 폐기하고 새로 시작할 수 있다.

#### 인수 조건

1. WHEN 사용자가 재시도 버튼을 클릭하면, THE System SHALL 새로운 Conversation_ID를 생성한다
2. WHEN 새로운 Conversation_ID가 생성되면, THE System SHALL 이전 대화의 draft 및 Project_Spec을 폐기 또는 별도 보관한다
3. WHEN 재시도가 시작되면, THE System SHALL 채팅 UI 상태를 초기화하여 빈 대화 화면을 표시한다
4. THE System SHALL 재시도 후에도 이전 대화 기록에 접근 가능하도록 별도 보관한다

---

### 요구사항 9: DynamoDB 활동 로그 저장소

**사용자 스토리:** 시스템 운영자로서, 팀원별 활동 로그가 영구적으로 저장되기를 원한다. 이를 통해 활동 이력을 추적하고 분쟁 시 근거 자료로 활용할 수 있다.

#### 인수 조건

1. THE DynamoDB_Table SHALL 팀원 이름, GitHub ID, 역할, 커밋 수, Notion 완료 태스크 수, 마감 준수 여부, 타임스탬프를 포함하는 Activity_Log 레코드를 저장한다
2. WHEN Tracker_Agent가 데이터를 저장하면, THE DynamoDB_Table SHALL 타임스탬프 기반으로 이력을 누적 저장한다
3. WHEN Dashboard가 활동 데이터를 요청하면, THE DynamoDB_Table SHALL 저장된 Activity_Log를 조회 가능하게 제공한다

---

### 요구사항 10: AWS Serverless 인프라 구성

**사용자 스토리:** 개발자로서, 모든 서비스가 AWS Serverless 아키텍처 위에서 독립적으로 배포 및 실행되기를 원한다. 이를 통해 운영 비용을 최소화하고 확장성을 확보할 수 있다.

#### 인수 조건

1. THE System SHALL Chat_Agent, Notion_Builder, Tracker_Agent, Reminder_Service를 독립적인 Lambda 함수로 정의한다
2. THE System SHALL Chat_Agent와 Notion_Builder에 대해 HTTP API Gateway POST 엔드포인트를 구성한다
3. THE System SHALL Tracker_Agent에 대해 CloudWatch Events rate(1 hour) 스케줄 트리거를 구성한다
4. THE System SHALL Reminder_Service에 대해 CloudWatch Events rate(1 hour) 스케줄 트리거를 구성한다
5. THE System SHALL GEMINI_API_KEY, NOTION_API_KEY, NOTION_PARENT_DB_ID, GITHUB_TOKEN 환경 변수를 Lambda 함수에 주입한다
6. THE System SHALL Python 3.12 런타임과 us-east-1 리전을 사용한다
7. THE System SHALL Lambda 함수 생성 시 기존 역할(SafeRole-{username})을 사용한다 (새 역할 생성 불가)
8. THE System SHALL Access Key를 발급하지 않고 IAM Role 기반으로 AWS 서비스에 접근한다

---

### 요구사항 11: 환경 변수 및 보안 설정

**사용자 스토리:** 개발자로서, API 키와 인증 토큰이 안전하게 관리되기를 원한다. 이를 통해 민감 정보 노출 없이 서비스를 운영할 수 있다.

#### 인수 조건

1. THE System SHALL GEMINI_API_KEY, NOTION_API_KEY, NOTION_PARENT_DB_ID, GITHUB_TOKEN, AWS_REGION을 환경 변수로 관리한다
2. THE System SHALL .env.example 파일을 통해 필요한 환경 변수 목록을 문서화한다
3. THE System SHALL .gitignore를 통해 .env 파일이 버전 관리에 포함되지 않도록 한다

---

### 요구사항 12: 프론트엔드 UI 구성

**사용자 스토리:** 팀원으로서, 채팅 UI, 가용시간 입력 UI, 활동 대시보드를 하나의 웹 애플리케이션에서 사용하고 싶다. 이를 통해 흩어진 도구 없이 통합된 환경에서 협업할 수 있다.

#### 인수 조건

1. THE System SHALL React(Vite) 기반의 SPA 웹 애플리케이션을 제공한다
2. THE System SHALL 채팅 UI 화면에서 Gemini 기반 명세 생성 대화를 수행할 수 있도록 한다
3. THE System SHALL 가용시간 입력 UI 화면에서 Availability_Grid를 표시한다
4. THE System SHALL 대시보드 UI 화면에서 팀원별 Activity_Status 배너를 퍼센트와 함께 표시하고, 기여도 요소 아래에 GitHub 커밋 횟수를 참고 지표로 작게 표시한다
5. THE System SHALL 각 화면 간 네비게이션을 제공한다

---

## 4. UI 구성 (화면 설계)

### 메인 페이지 레이아웃: "Talk to Notion-Build"

> 채팅으로 요구사항을 정리하고 바로 실행 가능한 계획으로 바꿉니다.

#### 좌측 패널 - 요구사항 채팅
- 채팅 인터페이스 (말풍선 형태)
- 사용자 입력 -> AI 응답 반복
- 하단 입력창 + 전송 버튼
- retry 버튼: 새 채팅 세션 시작
- config 버튼: 설정 패널 열기

#### 우측 상단 - 프로젝트 요약
- AI가 정리한 프로젝트 요약 텍스트
- Markdown 다운로드 버튼

#### 우측 중단 - 전체 진행률
- 프로그레스 바 (퍼센트 표시)
- 전체 task 완료율 시각화

#### 우측 중하단 좌 - 팀원 참여도
- 팀원별 원형 차트 (도넛 그래프)
- 퍼센트 수치 표시
- 상태 라벨: 기여도 낮음 / 정상 / 주의
- 기여도 요소 아래에 GitHub 커밋 횟수 작게 표시 (참고 지표)
- 경고 배너: 경고 N명 표시

#### 우측 중하단 우 - 마일스톤
- 주요 마일스톤 목록
- 각 항목: 마일스톤명 + 마감일 + 상태(완료/진행 중/대기)

#### 상단 알림 배너 - 무임승차 경고
- 참여도가 낮은 팀원 경고 팝업
- 팀원명 + 참여도 퍼센트 + 이메일
- 메일 보내기 버튼

#### 추가 예정 - 시간표 UI
- when2meet 스타일 가용시간 입력 그리드
- 요일 x 시간대 매트릭스
- 클릭/드래그로 시간 선택
- 공통 가능 시간 하이라이트

---

## 5. 기술 스택

### 프론트엔드
- React (Vite)
- when2meet 스타일 커스텀 시간표 UI
- 채팅 UI
- 대시보드 UI (프로그레스 바, 도넛 차트, 마일스톤)

### 백엔드
- FastAPI (Python)
- Gemini API 연동
- 입력 스키마 검증 (Pydantic)
- Notion API 연동
- GitHub API 연동

### 인프라
- AWS Lambda (Python 3.12 런타임)
- CloudWatch Events (스케줄 트리거)
- AWS SES
- DynamoDB
- API Gateway
- S3 / Amplify (프론트엔드 배포)

---

## 6. 시스템 전체 흐름

```
Step 1. 팀장 입력
  -> 채팅창에서 프로젝트 정보 입력

Step 2. Gemini 초안 생성
  -> 역할 분담, task 목록, deadline 구조화

Step 3. 사용자 수정
  -> 채팅으로 계속 수정/보완

Step 4. 승인
  -> 사용자가 승인 버튼 클릭

Step 5. 백엔드 검증 (Validation_Service)
  -> 입력값 검증, 스키마 정리, 누락 필드 보완

Step 6. Notion 생성 (Notion_Builder)
  -> 프로젝트 메인 페이지 생성
  -> 팀원별 인라인 DB 생성 (팀원 이름 heading + 인라인 DB)
  -> 각 팀원 DB에 배정된 task 레코드 추가

Step 7. 주기적 모니터링 (Tracker_Agent)
  -> Lambda가 1시간마다 각 팀원의 Notion 인라인 DB + GitHub 조회
  -> 활동 지표 계산 -> DynamoDB 저장

Step 8. 자동 메일 발송 (Reminder_Service)
  -> 내일 마감 + 미완료 task 대상
  -> KST 정오 12시 자동 발송

Step 9. 대시보드 표시 (Dashboard)
  -> 팀원별 Activity_Status 배너 (퍼센트)
  -> 전체 진행률
  -> 마일스톤 현황
  -> 무임승차 경고
```

---

## 7. 최종 정리

- 시간표 기능은 when2meet 스타일의 간단한 직접 구현 UI로 제공한다.
- Notion은 프로젝트 메인 페이지 안에 팀원별 인라인 DB를 생성하여 협업 보드로 사용한다.
- 완료 처리는 버튼이 아니라 상태 속성 변경(시작 전/진행 중/완료)으로 처리한다.
- 활동 평가는 기여도 점수가 아니라 활동 지표 / 기여도 추정치로 표현한다.
- 마감 하루 전 정오에 자동 메일을 발송하기 위해 1시간마다 실행되는 Lambda 기반 검사 구조를 사용한다.
- 채팅 기반 명세 생성은 Gemini가 담당하되, 최종 저장 전에는 반드시 백엔드 스키마 검증을 거친다.
- 재시도 버튼은 새 Conversation_ID를 발급하여 완전히 새로운 채팅 세션을 시작한다.
