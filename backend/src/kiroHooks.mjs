export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { team_scores = [], checklist_completion = 0 } = body;
    
    // Validate deployment integrity
    const allCompleted = checklist_completion === 100;
    const noFreeRiders = team_scores.every(member => member.score >= 1.0);
    
    if (!allCompleted || !noFreeRiders) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          action: "BLOCK_DEPLOYMENT",
          reason: "배포 조건 미달 (체크리스트 미완료 또는 무임승차자 존재)",
          details: { team_scores, checklist_completion }
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        action: "APPROVE_DEPLOYMENT",
        message: "배포 무결성 검증 통과 완료"
      })
    };
  } catch (err) {
    // In critical hook path, default to block when error state happens
    return {
      statusCode: 500,
      body: JSON.stringify({ action: "BLOCK_DEPLOYMENT", error: "Validation Error" })
    };
  }
};
