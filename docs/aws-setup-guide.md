# AWS 셋팅 가이드 - Team-Up Sentinel

## 환경 정보

| 항목 | 값 |
|------|-----|
| 리전 | us-east-1 (버지니아 북부) |
| Lambda 역할 | SafeRole-{username} (기존 역할 사용, 새 역할 생성 X) |
| Access Key | 발급 불가, IAM Role만 사용 |
| S3 버킷 이름 | {username}으로 시작 |

---

## 1. Lambda 함수 (1순위)

### 1-1. 메인 API 함수 (team-up-sentinel-api)

모든 HTTP 요청을 처리하는 단일 Lambda 함수.

| 항목 | 설정값 |
|------|--------|
| 함수 이름 | team-up-sentinel-api |
| 런타임 | Python 3.12 |
| 핸들러 | app.handlers.handler |
| 아키텍처 | x86_64 |
| 메모리 | 256 MB |
| 제한 시간 | 60초 |
| 실행 역할 | SafeRole-{username} (기존 역할 선택) |

#### 환경 변수 설정

Lambda 콘솔 → 구성 → 환경 변수에서 추가:

| 키 | 값 | 설명 |
|----|-----|------|
| GEMINI_API_KEY | AIzaSy... | Google Gemini API 키 |
| NOTION_API_KEY | ntn_... | Notion Integration 시크릿 |
| NOTION_PARENT_PAGE_ID | 32af6c... | Notion 부모 페이지 ID |
| GITHUB_TOKEN | ghp_... | GitHub Personal Access Token |
| SES_SENDER_EMAIL | 인증된이메일@도메인 | SES 발신자 이메일 |
| AWS_REGION | us-east-1 | AWS 리전 |

#### 함수 URL 설정

Lambda 콘솔 → 구성 → 함수 URL:

| 항목 | 설정값 |
|------|--------|
| 인증 유형 | NONE (퍼블릭 액세스) |
| CORS 허용 오리진 | * (배포 후 프론트엔드 도메인으로 제한) |
| CORS 허용 메서드 | GET, POST, PUT, DELETE, OPTIONS |
| CORS 허용 헤더 | Content-Type, Authorization |
| CORS 노출 헤더 | * |
| CORS Max Age | 86400 |

> 함수 URL 생성 후 `https://{url-id}.lambda-url.us-east-1.on.aws/` 형태의 URL이 발급됨.
> 이 URL을 프론트엔드의 API_URL로 사용.

#### 배포 패키지 만들기

```bash
# backend/ 디렉토리에서 실행
pip install -r requirements.txt -t package/
cp -r app/ package/app/
cd package
zip -r ../deployment.zip .
```

Lambda 콘솔 → 코드 → .zip 파일 업로드로 `deployment.zip` 업로드.

> 패키지 크기가 50MB 초과 시 S3에 업로드 후 S3 URL로 배포.


### 1-2. Tracker Lambda 함수 (team-up-sentinel-tracker)

더미 데이터 기반 활동 지표 수집 (수동 실행/테스트용).

| 항목 | 설정값 |
|------|--------|
| 함수 이름 | team-up-sentinel-tracker |
| 런타임 | Python 3.12 |
| 핸들러 | app.handlers.tracker_handler |
| 메모리 | 256 MB |
| 제한 시간 | 120초 |
| 실행 역할 | SafeRole-{username} |

환경 변수: 메인 API 함수와 동일.
배포 패키지: 메인 API 함수와 동일한 zip 사용 가능.

> 현재는 더미 데이터 사용이므로 CloudWatch Events 스케줄 없음.
> Lambda 콘솔에서 테스트 이벤트로 수동 실행.

### 1-3. Reminder Lambda 함수 (team-up-sentinel-reminder)

마감 리마인드 메일 발송 (수동 실행/테스트용).

| 항목 | 설정값 |
|------|--------|
| 함수 이름 | team-up-sentinel-reminder |
| 런타임 | Python 3.12 |
| 핸들러 | app.handlers.reminder_handler |
| 메모리 | 256 MB |
| 제한 시간 | 60초 |
| 실행 역할 | SafeRole-{username} |

환경 변수: 메인 API 함수와 동일.
배포 패키지: 메인 API 함수와 동일한 zip 사용 가능.

### Lambda 테스트 이벤트

메인 API 함수 테스트 (health check):

```json
{
  "requestContext": {
    "http": {
      "method": "GET",
      "path": "/health"
    }
  },
  "rawPath": "/health",
  "headers": {
    "content-type": "application/json"
  },
  "isBase64Encoded": false
}
```

Tracker/Reminder 테스트 (빈 이벤트):

```json
{}
```

---

## 2. S3 (1순위 - 프론트엔드 배포)

### 2-1. 버킷 생성

| 항목 | 설정값 |
|------|--------|
| 버킷 이름 | {username}-team-up-sentinel-frontend |
| 리전 | us-east-1 |
| 객체 소유권 | ACL 비활성화됨 (권장) |
| 퍼블릭 액세스 차단 | 모든 퍼블릭 액세스 차단 해제 ⚠️ |
| 버전 관리 | 비활성화 |
| 암호화 | SSE-S3 (기본값) |

### 2-2. 정적 웹 사이트 호스팅 활성화

S3 콘솔 → 버킷 → 속성 → 정적 웹 사이트 호스팅:

| 항목 | 설정값 |
|------|--------|
| 정적 웹 사이트 호스팅 | 활성화 |
| 호스팅 유형 | 정적 웹 사이트 호스팅 |
| 인덱스 문서 | index.html |
| 오류 문서 | index.html (SPA 라우팅용) |

### 2-3. 버킷 정책 (퍼블릭 읽기 허용)

S3 콘솔 → 버킷 → 권한 → 버킷 정책:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::{username}-team-up-sentinel-frontend/*"
    }
  ]
}
```

> `{username}` 부분을 실제 username으로 교체.

### 2-4. 프론트엔드 빌드 및 업로드

```bash
# frontend/ 디렉토리에서
npm run build

# 빌드 결과물 S3 업로드
aws s3 sync dist/ s3://{username}-team-up-sentinel-frontend/ --delete
```

> 업로드 후 웹사이트 엔드포인트:
> `http://{username}-team-up-sentinel-frontend.s3-website-us-east-1.amazonaws.com`

### 2-5. 프론트엔드 환경 변수

빌드 전 `.env` 파일에 Lambda 함수 URL 설정:

```env
VITE_API_URL=https://{url-id}.lambda-url.us-east-1.on.aws
```

---

## 3. SES (이메일 발송)

### 3-1. 이메일 주소 인증

SES 콘솔 → ID → ID 생성:

| 항목 | 설정값 |
|------|--------|
| ID 유형 | 이메일 주소 |
| 이메일 주소 | 발신자로 사용할 이메일 |

> 인증 메일이 발송됨 → 메일 내 링크 클릭하여 인증 완료.
> SES 샌드박스 모드에서는 수신자 이메일도 인증 필요.

### 3-2. SES 샌드박스 제한사항

| 제한 | 내용 |
|------|------|
| 발신 | 인증된 이메일만 발신 가능 |
| 수신 | 인증된 이메일만 수신 가능 |
| 일일 발송 한도 | 200통 |
| 초당 발송 한도 | 1통 |

> 테스트 시에는 팀원 이메일도 SES에서 인증해야 메일 수신 가능.
> 프로덕션 전환 시 AWS에 샌드박스 해제 요청 필요.

### 3-3. 리전 확인

| 항목 | 설정값 |
|------|--------|
| SES 리전 | us-east-1 |

> Lambda 환경 변수의 AWS_REGION과 동일한 리전에서 SES 설정.

---

## 4. DynamoDB (마지막 우선순위)

> 현재는 인메모리 저장소 사용 중. DynamoDB 연결 시 아래 테이블 생성.

### 4-1. conversations 테이블

| 항목 | 설정값 |
|------|--------|
| 테이블 이름 | conversations |
| 파티션 키 | conversation_id (String) |
| 정렬 키 | 없음 |
| 용량 모드 | 온디맨드 |

### 4-2. activity_logs 테이블

| 항목 | 설정값 |
|------|--------|
| 테이블 이름 | activity_logs |
| 파티션 키 | project_id (String) |
| 정렬 키 | timestamp_member (String) |
| 용량 모드 | 온디맨드 |

### 4-3. availability 테이블

| 항목 | 설정값 |
|------|--------|
| 테이블 이름 | availability |
| 파티션 키 | project_id (String) |
| 정렬 키 | member_day_time (String) |
| 용량 모드 | 온디맨드 |

### 4-4. projects 테이블

| 항목 | 설정값 |
|------|--------|
| 테이블 이름 | projects |
| 파티션 키 | project_id (String) |
| 정렬 키 | 없음 |
| 용량 모드 | 온디맨드 |

---

## 셋업 순서 체크리스트

### 1순위 (필수)
- [ ] Lambda 메인 API 함수 생성 (team-up-sentinel-api)
- [ ] Lambda 함수 URL 활성화 및 CORS 설정
- [ ] Lambda 환경 변수 설정 (GEMINI_API_KEY 등)
- [ ] 배포 패키지(zip) 생성 및 업로드
- [ ] Lambda 테스트 이벤트로 /health 확인
- [ ] S3 버킷 생성 ({username}-team-up-sentinel-frontend)
- [ ] S3 정적 웹 사이트 호스팅 활성화
- [ ] S3 버킷 정책 설정 (퍼블릭 읽기)
- [ ] 프론트엔드 빌드 (VITE_API_URL에 Lambda 함수 URL 설정)
- [ ] 프론트엔드 빌드 결과물 S3 업로드

### 2순위 (메일 기능)
- [ ] SES 발신자 이메일 인증
- [ ] SES 수신자 이메일 인증 (샌드박스 모드)
- [ ] Lambda Tracker 함수 생성 (team-up-sentinel-tracker)
- [ ] Lambda Reminder 함수 생성 (team-up-sentinel-reminder)

### 3순위 (영구 저장소)
- [ ] DynamoDB conversations 테이블 생성
- [ ] DynamoDB activity_logs 테이블 생성
- [ ] DynamoDB availability 테이블 생성
- [ ] DynamoDB projects 테이블 생성
- [ ] 백엔드 코드에서 인메모리 → DynamoDB 전환
