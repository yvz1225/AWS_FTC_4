# 요구사항 문서

## 소개

Team-Up Sentinel은 대학생 협업 프로젝트를 위한 지능형 노션 인프라 및 무임승차 방지 솔루션이다. 5개의 AI 에이전트(Manager, Builder, Tracker, Report/Judge, KIRO Deploy Hooks)가 AWS Serverless 아키텍처 위에서 동작하며, 프로젝트 기획 수집부터 Notion 인프라 자동 구축, GitHub/Notion 기여도 트래킹, 무임승차자 경고, 배포 차단까지 전 과정을 자동화한다. 본 문서는 백엔드 에이전트 로직과 AWS 인프라를 중심으로 요구사항을 정의한다.

## 용어 사전

- **Manager_Agent**: Google Gemini API를 활용하여 사용자와 대화형 인터페이스로 프로젝트 기획 정보를 수집하고, Builder Agent 기동을 위한 JSON 스펙을 생성하는 Lambda 함수
- **Builder_Agent**: Manager Agent가 생성한 JSON 스펙을 입력받아 Notion API를 호출하여 팀 대시보드 및 팀원별 하위 페이지를 자동 생성하는 Lambda 함수
- **Tracker_Agent**: EventBridge 스케줄(1시간 주기)에 의해 트리거되어 GitHub API와 Notion API로부터 팀원별 활동 데이터를 수집하고 DynamoDB에 저장하는 Lambda 함수
- **Report_Judge_Agent**: 수집된 활동 로그를 기반으로 기여도 점수를 산출하고, 무임승차자에게 AWS SES를 통해 경고 메일을 발송하는 Lambda 함수
- **KIRO_Hooks**: CI/CD 파이프라인에서 배포 요청 시 팀원 기여도와 체크리스트 달성률을 검증하여 배포를 승인 또는 차단하는 Lambda 함수
- **Project_Spec**: Manager Agent가 생성하는 JSON 형식의 프로젝트 설정 데이터로, project_info, members, checklist 필드를 포함한다
- **Contribution_Score**: 팀원의 기여도를 나타내는 수치로, Git 커밋 횟수와 Notion 완료 태스크 수를 가중 합산하여 산출한다 (Score = commits × 0.5 + notion_tasks × 0.5)
- **Yellow_Card**: 기여도 점수가 0인 팀원에게 부여되는 무임승차 경고 상태
- **Activity_Log**: Tracker Agent가 수집하여 DynamoDB에 저장하는 팀원별 활동 기록 (커밋 수, Notion 태스크 완료 수, 타임스탬프 포함)
- **DynamoDB_Table**: Activity Log를 저장하는 AWS DynamoDB 테이블
- **SES**: AWS Simple Email Service, 경고 메일 발송에 사용되는 이메일 서비스

## 요구사항

### 요구사항 1: Manager Agent 대화형 기획 수집

**사용자 스토리:** 프로젝트 리더로서, 챗봇 인터페이스를 통해 프로젝트 기획 정보를 입력하고 싶다. 이를 통해 팀 구성과 과업 분배를 체계적으로 정리할 수 있다.

#### 인수 조건

1. WHEN 사용자가 메시지를 전송하면, THE Manager_Agent SHALL Google Gemini API를 호출하여 대화 맥락을 유지한 응답을 생성한다
2. WHEN 사용자가 프로젝트 정보를 제공하면, THE Manager_Agent SHALL 프로젝트명, 팀원 이름, 역할, GitHub ID, 이메일을 필수 항목으로 수집한다
3. WHEN 필수 항목이 누락된 경우, THE Manager_Agent SHALL 누락된 항목을 명시하여 추가 정보를 요청하는 응답을 생성한다
4. WHEN 사용자가 "승인" 의사를 표시하면, THE Manager_Agent SHALL project_info, members, checklist 필드를 포함하는 유효한 Project_Spec JSON을 생성한다
5. IF Gemini API 호출이 실패하면, THEN THE Manager_Agent SHALL HTTP 500 상태 코드와 에러 메시지를 반환한다
6. THE Manager_Agent SHALL 이전 대화 내역(history)을 포함하여 Gemini API에 전달함으로써 멀티턴 대화 맥락을 유지한다

### 요구사항 2: Builder Agent Notion 인프라 자동 구축

**사용자 스토리:** 프로젝트 리더로서, 확정된 기획 스펙을 기반으로 Notion 워크스페이스가 자동 생성되기를 원한다. 이를 통해 수동 설정 없이 협업 인프라를 즉시 사용할 수 있다.

#### 인수 조건

1. WHEN 유효한 Project_Spec JSON을 수신하면, THE Builder_Agent SHALL Notion API를 호출하여 프로젝트명이 포함된 메인 대시보드 페이지를 생성한다
2. WHEN 메인 대시보드가 생성되면, THE Builder_Agent SHALL members 배열의 각 팀원에 대해 이름, GitHub ID, 이메일 정보가 포함된 하위 페이지를 생성한다
3. WHEN 모든 페이지 생성이 완료되면, THE Builder_Agent SHALL 대시보드 URL을 포함하는 HTTP 200 응답을 반환한다
4. IF Project_Spec에 project_info 또는 members 필드가 누락되면, THEN THE Builder_Agent SHALL "Invalid Specification" 에러 메시지와 함께 HTTP 500 응답을 반환한다
5. IF Notion API 호출이 실패하면, THEN THE Builder_Agent SHALL 에러 메시지를 로깅하고 HTTP 500 응답을 반환한다

### 요구사항 3: Tracker Agent 주기적 활동 데이터 수집

**사용자 스토리:** 프로젝트 관리자로서, 팀원들의 GitHub 커밋과 Notion 태스크 완료 현황이 자동으로 수집되기를 원한다. 이를 통해 실시간 기여도 모니터링이 가능하다.

#### 인수 조건

1. THE Tracker_Agent SHALL EventBridge 스케줄에 의해 1시간 주기로 자동 실행된다
2. WHEN 실행되면, THE Tracker_Agent SHALL GitHub API를 호출하여 등록된 팀원별 커밋 횟수를 수집한다
3. WHEN 실행되면, THE Tracker_Agent SHALL Notion API를 호출하여 팀원별 완료된 태스크 수를 수집한다
4. WHEN GitHub 및 Notion 데이터 수집이 완료되면, THE Tracker_Agent SHALL 팀원 이름, 역할, GitHub ID, 커밋 수, Notion 태스크 수, 타임스탬프를 포함하는 Activity_Log를 DynamoDB_Table에 저장한다
5. IF GitHub API 또는 Notion API 호출이 실패하면, THEN THE Tracker_Agent SHALL 에러를 로깅하고 HTTP 500 응답을 반환한다

### 요구사항 4: Report/Judge Agent 기여도 평가 및 경고

**사용자 스토리:** 프로젝트 관리자로서, 팀원별 기여도가 자동으로 평가되고 무임승차자에게 경고가 발송되기를 원한다. 이를 통해 공정한 협업 환경을 유지할 수 있다.

#### 인수 조건

1. WHEN Activity_Log 목록을 수신하면, THE Report_Judge_Agent SHALL 각 팀원의 Contribution_Score를 commits × 0.5 + notion_tasks × 0.5 공식으로 산출한다
2. WHEN Contribution_Score가 0이면, THE Report_Judge_Agent SHALL 해당 팀원의 상태를 Yellow_Card로 설정한다
3. WHEN 팀원 상태가 Yellow_Card이고 이메일 주소가 존재하면, THE Report_Judge_Agent SHALL AWS SES를 통해 해당 팀원에게 무임승차 경고 메일을 발송한다
4. WHEN 모든 팀원의 평가가 완료되면, THE Report_Judge_Agent SHALL 팀원별 이름, GitHub ID, 점수, 상태를 포함하는 리포트를 HTTP 200 응답으로 반환한다
5. IF SES 메일 발송이 실패하면, THEN THE Report_Judge_Agent SHALL 에러를 로깅하고 나머지 팀원의 평가를 계속 진행한다
6. IF 요청 처리 중 예외가 발생하면, THEN THE Report_Judge_Agent SHALL HTTP 500 상태 코드와 에러 메시지를 반환한다

### 요구사항 5: KIRO Deploy Hooks 배포 무결성 검증

**사용자 스토리:** 프로젝트 관리자로서, 배포 시점에 팀원 기여도와 체크리스트 달성률을 자동 검증하여 조건 미달 시 배포를 차단하고 싶다. 이를 통해 무임승차자가 포함된 상태로 프로젝트가 배포되는 것을 방지할 수 있다.

#### 인수 조건

1. WHEN 배포 검증 요청을 수신하면, THE KIRO_Hooks SHALL team_scores 배열과 checklist_completion 값을 검증한다
2. WHEN 모든 팀원의 Contribution_Score가 1.0 이상이고 checklist_completion이 100이면, THE KIRO_Hooks SHALL HTTP 200 상태 코드와 "APPROVE_DEPLOYMENT" 액션을 반환한다
3. WHEN 팀원 중 Contribution_Score가 1.0 미만인 팀원이 존재하면, THE KIRO_Hooks SHALL HTTP 403 상태 코드와 "BLOCK_DEPLOYMENT" 액션을 반환한다
4. WHEN checklist_completion이 100 미만이면, THE KIRO_Hooks SHALL HTTP 403 상태 코드와 "BLOCK_DEPLOYMENT" 액션을 반환한다
5. WHEN 배포가 차단되면, THE KIRO_Hooks SHALL team_scores와 checklist_completion 상세 정보를 응답에 포함한다
6. IF 검증 처리 중 예외가 발생하면, THEN THE KIRO_Hooks SHALL HTTP 500 상태 코드와 "BLOCK_DEPLOYMENT" 액션을 반환한다 (안전 우선 원칙)

### 요구사항 6: AWS Serverless 인프라 구성

**사용자 스토리:** 개발자로서, 모든 에이전트가 AWS Serverless 아키텍처 위에서 독립적으로 배포 및 실행되기를 원한다. 이를 통해 운영 비용을 최소화하고 확장성을 확보할 수 있다.

#### 인수 조건

1. THE Serverless_Framework SHALL 5개 Lambda 함수(Manager_Agent, Builder_Agent, Tracker_Agent, Report_Judge_Agent, KIRO_Hooks)를 독립적으로 정의한다
2. THE Serverless_Framework SHALL Manager_Agent, Builder_Agent, Report_Judge_Agent, KIRO_Hooks에 대해 HTTP API Gateway POST 엔드포인트를 구성한다
3. THE Serverless_Framework SHALL Tracker_Agent에 대해 EventBridge rate(1 hour) 스케줄 트리거를 구성한다
4. THE Serverless_Framework SHALL GEMINI_API_KEY, NOTION_API_KEY, NOTION_PARENT_DB_ID, GITHUB_TOKEN 환경 변수를 Lambda 함수에 주입한다
5. THE Serverless_Framework SHALL Node.js 20.x 런타임과 ap-northeast-2 리전을 사용한다

### 요구사항 7: DynamoDB 활동 로그 저장소

**사용자 스토리:** 시스템 운영자로서, 팀원별 활동 로그가 영구적으로 저장되기를 원한다. 이를 통해 기여도 이력을 추적하고 분쟁 시 근거 자료로 활용할 수 있다.

#### 인수 조건

1. THE DynamoDB_Table SHALL 팀원 이름, GitHub ID, 역할, 커밋 수, Notion 태스크 수, 타임스탬프를 포함하는 Activity_Log 레코드를 저장한다
2. WHEN Tracker_Agent가 데이터를 저장하면, THE DynamoDB_Table SHALL 타임스탬프 기반으로 이력을 누적 저장한다
3. WHEN Report_Judge_Agent가 평가를 수행하면, THE DynamoDB_Table SHALL 저장된 Activity_Log를 조회 가능하게 제공한다

### 요구사항 8: 환경 변수 및 보안 설정

**사용자 스토리:** 개발자로서, API 키와 인증 토큰이 안전하게 관리되기를 원한다. 이를 통해 민감 정보 노출 없이 서비스를 운영할 수 있다.

#### 인수 조건

1. THE System SHALL GEMINI_API_KEY, NOTION_API_KEY, NOTION_PARENT_DB_ID, GITHUB_TOKEN, AWS_REGION을 환경 변수로 관리한다
2. THE System SHALL .env.example 파일을 통해 필요한 환경 변수 목록을 문서화한다
3. THE System SHALL .gitignore를 통해 .env 파일이 버전 관리에 포함되지 않도록 한다
