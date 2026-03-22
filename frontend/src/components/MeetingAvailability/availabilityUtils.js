// day: 0~4 (월~금), hour: 9~23
export const DAYS = ["월", "화", "수", "목", "금"];
export const HOURS = Array.from({ length: 15 }, (_, i) => i + 9); // 9~23
export const MEMBERS = [
  { id: "A", name: "팀원 A" },
  { id: "B", name: "팀원 B" },
  { id: "C", name: "팀원 C" },
  { id: "D", name: "팀원 D" },
];

/** 초기 mock 데이터 생성 */
export function createMockAvailability() {
  const data = {};
  MEMBERS.forEach(({ id }) => {
    data[id] = {};
    for (let d = 0; d < 5; d++) {
      data[id][d] = {};
      HOURS.forEach((h) => {
        data[id][d][h] = false;
      });
    }
  });

  // 팀원 A: 월 10~12, 화 14~16, 수 10~12
  [[0,10],[0,11],[0,12],[1,14],[1,15],[2,10],[2,11]].forEach(([d,h]) => { data["A"][d][h] = true; });
  // 팀원 B: 월 10~12, 화 14~17, 목 13~15
  [[0,10],[0,11],[1,14],[1,15],[1,16],[3,13],[3,14]].forEach(([d,h]) => { data["B"][d][h] = true; });
  // 팀원 C: 화 14~16, 수 11~13, 목 13~15
  [[1,14],[1,15],[2,11],[2,12],[3,13],[3,14]].forEach(([d,h]) => { data["C"][d][h] = true; });
  // 팀원 D: 월 11~13, 화 15~17, 금 10~12
  [[0,11],[0,12],[1,15],[1,16],[4,10],[4,11]].forEach(([d,h]) => { data["D"][d][h] = true; });

  return data;
}

/** 각 셀에 몇 명이 가능한지 계산 */
export function calcOverlapCount(availability) {
  const result = {};
  for (let d = 0; d < 5; d++) {
    result[d] = {};
    HOURS.forEach((h) => {
      result[d][h] = MEMBERS.filter(({ id }) => availability[id]?.[d]?.[h]).length;
    });
  }
  return result;
}

/** 연속된 시간 블록 기준 추천 시간대 계산 (상위 3개) */
export function calcRecommendations(overlapCount, minPeople = 2) {
  const blocks = [];

  for (let d = 0; d < 5; d++) {
    let blockStart = null;
    let blockCount = 0;

    for (let i = 0; i < HOURS.length; i++) {
      const h = HOURS[i];
      const count = overlapCount[d][h];

      if (count >= minPeople) {
        if (blockStart === null) {
          blockStart = h;
          blockCount = count;
        } else {
          blockCount = Math.min(blockCount, count); // 블록 내 최소 인원
        }
      } else {
        if (blockStart !== null) {
          blocks.push({ day: d, start: blockStart, end: h, minCount: blockCount });
          blockStart = null;
          blockCount = 0;
        }
      }
    }
    if (blockStart !== null) {
      blocks.push({ day: d, start: blockStart, end: HOURS[HOURS.length - 1] + 1, minCount: blockCount });
    }
  }

  // 인원 내림차순, 같으면 블록 길이 내림차순
  return blocks
    .sort((a, b) => b.minCount - a.minCount || (b.end - b.start) - (a.end - a.start))
    .slice(0, 3);
}

export function formatHour(h) {
  return `${String(h).padStart(2, "0")}:00`;
}
