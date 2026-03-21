// import axios from 'axios';
// import AWS from 'aws-sdk';
// const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
  try {
    console.log("Tracker Agent Started (Cron triggered)");

    // 1. Fetch Total Logs from Notion (Query Total Log DB)
    // 2. Fetch Commits from GitHub API via Repo URL
    // 3. Map Commits to registered GitHub IDs
    // 4. Save aggregated logs to DynamoDB
    
    // MVP Mocking Logic
    const mockData = {
      timestamp: new Date().toISOString(),
      logs: [
        { name: "유진", role: "Frontend", github_id: "yujin-dev", commits: 5, notion_tasks: 2 },
        { name: "민수", role: "Backend", github_id: "minsu-dev", commits: 0, notion_tasks: 0 } // 무임승차 의심
      ]
    };

    console.log("Saving logs to DynamoDB:", mockData);
    // await dynamoDb.put({ TableName: 'TeamUpLogs', Item: mockData }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Tracking cycle completed', logs: mockData }),
    };

  } catch (error) {
    console.error('Tracker Agent Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Tracking failed' }),
    };
  }
};
