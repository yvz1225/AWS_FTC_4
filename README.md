# 🛡️ Team-Up Sentinel

> **대학생 협업 프로젝트를 위한 지능형 노션 인프라 및 무임승차 방지 솔루션**

Team-Up Sentinel은 프로젝트 매니징, 인프라 셋업, 기여도 트래킹, 그리고 무임승차자 제재까지 전 과정을 AI 에이전트들이 자동화하여 관리해주는 협업 관리 솔루션입니다. AWS 기반의 서버리스 아키텍처와 Notion, GitHub API, Google Gemini API를 활용하여 완벽한 프로젝트 생태계를 구축합니다.

<br>

## ✨ 핵심 기능 (Core Features)

- **🤖 AI Manager Agent**: 챗봇 인터페이스를 통해 프로젝트 기획을 구체화하고 팀원별 역할과 과업을 Google Gemini API를 활용하여 자동으로 분해(Task Decomposition)합니다.
- **🏗️ Automated Notion Builder**: 확정된 기획을 바탕으로 Notion API를 호출해 팀 전체 대시보드와 개인별 칸반 보드, 활동 이력(Total Log) DB를 빠르게 구축합니다.
- **🕵️ Data Tracker & Judge**: AWS EventBridge를 통해 1시간 주기로 GitHub 커밋 내역과 Notion 업무 완료 버튼 클릭을 수집하여 기여도를 평가합니다. 무임승차 감지 시 AWS SES를 통해 자동 경고 메일을 발송합니다.
- **🛑 KIRO Deploy Hooks**: 프로젝트 배포 시, 팀원들의 기여도와 체크리스트 달성률을 확인하여 미달 시 프로젝트 배포를 원천 차단(Block)합니다.

<br>

## 🏛️ 시스템 아키텍처 (System Architecture)

| 단계 | 담당 에이전트 | 활용 기술 / API | 핵심 산출물 |
|:---:|---|---|---|
| **1. 기획** | `Manager Agent` | Google Gemini 2.5 API | 팀원 매칭 테이블, 과업 JSON 스펙 |
| **2. 구축** | `Builder Agent` | Notion API | 독립된 팀원별 노션 페이지 & 보고 버튼 |
| **3. 트래킹**| `Tracker Agent` | GitHub API, EventBridge | Amazon DynamoDB 통합 활동 로그 |
| **4. 분석** | `Report/Judge Agent`| AWS Lambda, AWS SES | 최종 기여도 점수, 옐로카드 경고 메일 |
| **5. 제어** | `KIRO Hooks` | AWS Lambda (Webhook) | 최종 배포 승인/차단 리포트 |

<br>

## 🚀 에이전트 워크플로우 (How it works)

### Step 1. 기획 및 요구사항 수집 (`Manager Agent`)
- 사용자는 화면의 챗봇 창에서 프로젝트 주제를 입력합니다.
- Agent가 친절한 인터랙션을 통해 `팀원 이름, 역할, GitHub ID, 이메일`을 필수적으로 수집합니다.
- 설정이 승인되면 최종 노션 셋업용 JSON 스펙을 생성합니다.

### Step 2. 자동화된 인프라 구축 (`Builder Agent`)
- JSON 데이터를 받아 즉시 메인 대시보드와 개인별 하위 페이지를 만듭니다.
- 각 개인 페이지에는 **[업무 완료 보고]** 버튼이 삽입되며, 버튼 클릭 시 공통 데이터베이스로 내역이 전송됩니다.

### Step 3. 실시간 트래킹 (`Tracker Agent`)
- 1시간마다 EventBridge가 트리거되어 Lambda를 실행합니다.
- Notion API (버튼 클릭 이력)와 GitHub API (커밋 횟수) 데이터를 백그라운드에서 적재합니다.

### Step 4. 무임승차 제재 및 리포트 (`Judge Agent`)
- 수집된 Data를 바탕으로 점수(`Score = Git * 0.5 + Notion * 0.5`)를 산출합니다.
- 기여도가 현저히 낮거나 정지된 팀원에게 AWS SES를 통해 자동 리마인드 메일을 전송하고 대시보드에 옐로카드를 부여합니다.

### Step 5. 무결성 강제 배포 제어 (`KIRO Hooks`)
- CI/CD 파이프라인에서 최종 배포 시그널을 가로채어 기여도 조건을 검사합니다.
- 조건 미달 시 배포를 중단하고, 상세한 방어 실패 리포트를 제공합니다.

<br>

## 🛠️ 기술 스택 (Tech Stack)

- **Frontend**: React, Glassmorphism UI
- **AI & Automation**: Google Gemini API (`@google/genai`)
- **Backend/Serverless**: Node.js, Serverless Framework, AWS Lambda, EventBridge, DynamoDB
- **Notification**: AWS SES
- **Third-party APIs**: Notion API, GitHub API

<br>

## ⚙️ 설정 및 실행 방법 (Getting Started)

1. **환경 변수 세팅 (`.env.example` 복사 후 `.env` 생성)**
   ```env
   # Backend Services
   GEMINI_API_KEY=your_google_gemini_api_key
   NOTION_API_KEY=your_notion_integration_secret
   NOTION_PARENT_DB_ID=your_notion_dashboard_db_id
   GITHUB_TOKEN=your_github_personal_access_token
   AWS_REGION=ap-northeast-2

   # Frontend
   REACT_APP_API_URL=https://your-api-gateway-id...
   ```
2. **백엔드 배포 (Serverless Lambda)**
   ```bash
   cd backend
   npm install
   npx serverless deploy
   ```
3. **프론트엔드 실행 (React)**
   ```bash
   cd frontend
   npm install
   npm start
   ```

---
*Created by Team-Up Sentinel*
