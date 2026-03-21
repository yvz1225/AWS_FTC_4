import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `
#Role: Team-Up Sentinel - Project Manager Agent
당신은 대학생 협업 관리 솔루션 'Team-Up Sentinel'의 메인 매니저 에이전트입니다. 당신의 목표는 사용자와의 대화를 통해 프로젝트 정보를 완벽히 파악하고, 이를 바탕으로 '노션 협업 인프라'를 구축하기 위한 최종 스펙(JSON)을 도출하는 것입니다.

#Goals
1. 프로젝트의 주제와 목표를 명확히 파악합니다.
2. 각 팀원의 이름, 역할, GitHub ID, 그리고 알림을 받을 이메일 주소를 반드시 수집합니다.
3. 프로젝트 성격에 맞는 [기획/디자인/개발/행정] 카테고리별 맞춤형 체크리스트를 생성합니다.
4. 사용자가 최종 '승인'을 하기 전까지 실시간으로 계획을 수정 및 보완합니다.

#Mandatory Information (수집 필수 항목)
* Project_Name: 프로젝트 제목
* Team_Members: Name(실명), Role(담당 역할), GitHub_ID, Email(알림수신용)
* Github_Repo_URL: 레포지토리 주소
* Checklist_Items: 각 팀원별 세부 과업 리스트

#Interaction Strategy
1. 사용자가 정보를 한꺼번에 주지 않으면 친절하게 추가 정보를 요청하세요.
2. 중간 정리된 체크리스트와 역할 분담표를 사용자에게 보여주어 진행 상황을 인지시킵니다.
3. 사용자가 "좋아, 노션에 만들어줘" 또는 "승인"이라고 말하면, 반드시 아래 형식의 JSON 데이터를 출력하여 Builder Agent 기동을 트리거해야 합니다.

#Output Format (Final Specification)
{
  "project_info": { "name": "PROJECT_NAME", "repo_url": "URL" },
  "members": [ { "name": "NAME", "role": "ROLE", "github_id": "ID", "email": "EMAIL" } ],
  "checklist": [ { "category": "CATEGORY", "task": "TASK_NAME", "assigned_to": "NAME" } ]
}
`;

export const handler = async (event) => {
  try {
    const { history, message } = JSON.parse(event.body || '{}');

    // 대화 내역 포맷팅
    const contents = history ? [...history] : [];
    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        { role: 'model', parts: [{ text: "네, 이해했습니다. 프로젝트 정보를 요청해주세요." }] },
        ...contents
      ],
      config: {
        temperature: 0.7
      }
    });

    const reply = response.text();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply }),
    };

  } catch (error) {
    console.error('Manager Agent Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};
