import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({ region: process.env.AWS_REGION });

export const handler = async (event) => {
  try {
    // 1. Fetch Logs from DynamoDB
    const reqBody = JSON.parse(event.body || '{}');
    const logs = reqBody.logs || []; 
    const report = [];

    // 2. Score Calculation & Judge Logic
    for (const log of logs) {
      const score = (log.commits * 0.5) + (log.notion_tasks * 0.5);
      let status = "NORMAL";
      
      if (score === 0) {
        status = "WARNING_YELLOW_CARD";
        
        // 3. SES Email dispatch for Free-riders
        if (log.email) {
          const params = {
            Source: 'admin@team-up-sentinel.com',
            Destination: { ToAddresses: [log.email] },
            Message: {
              Subject: { Data: `[Team-Up Sentinel] 옐로카드 경고 - 프로젝트 과업 리마인드` },
              Body: { Text: { Data: `${log.name}님, 최근 프로젝트 기여도가 감지되지 않았습니다. 부여된 과업을 확인해주세요.` } }
            }
          };
          try {
            await ses.send(new SendEmailCommand(params));
            console.log(`Warning email sent to ${log.email}`);
          } catch (e) {
            console.error("SES Error", e);
          }
        }
      }
      
      report.push({ name: log.name, github_id: log.github_id, score, status });
    }

    return { 
      statusCode: 200, 
      body: JSON.stringify({ message: 'Report Generated', report }) 
    };
  } catch(err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
