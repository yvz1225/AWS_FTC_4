import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const PARENT_PAGE_ID = process.env.NOTION_PARENT_DB_ID;

export const handler = async (event) => {
  try {
    const spec = JSON.parse(event.body || '{}');
    const { project_info, members, checklist } = spec;

    if (!project_info || !members) {
      throw new Error("Invalid Specification");
    }

    // 1. Create Main Dashboard Page
    const dashboard = await notion.pages.create({
      parent: { page_id: PARENT_PAGE_ID },
      properties: {
        title: [ { text: { content: `${project_info.name} 대시보드` } } ]
      }
    });

    // 2. Create Members Sub Pages & Checklist inline DBs
    // (This is a simplified MVP to show integration points)
    for (const member of members) {
      await notion.pages.create({
        parent: { page_id: dashboard.id },
        properties: {
          title: [ { text: { content: member.name } } ],
          // 추가 속성들 (GitHub_ID, Email) 등을 Property로 숨겨 저장
          "GitHub ID": { rich_text: [{ text: { content: member.github_id } }] },
          "알림 이메일": { email: member.email }
        }
      });
      // * 실제 프로덕션: 하위 페이지 내부에 체크리스트 DB(인라인) 및 템플릿 버튼 생성 로직 
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'Notion Setup Complete', 
        dashboardUrl: dashboard.url 
      }),
    };

  } catch (error) {
    console.error('Builder Agent Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
