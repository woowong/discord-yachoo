## Why

LCK 경기 방송의 팀 간 골드 격차 그래프(Gold Difference Graph)처럼, 턴 바이 턴 복기 모달 상단에 1~12 라운드 동안의 두 플레이어 간 점수 격차(Score Difference Trend)를 시각적인 라인 차트(Delta Line Chart)로 제공하면 역전의 순간과 점수 격차 흐름을 한눈에 체감할 수 있습니다.

## What Changes

1. **웹 대시보드 턴 복기 모달 마크업 확장**:
   - `dashboardHtml.ts` 내 `#replay-modal` 내부에 차트 컨테이너 `<div class="replay-chart-container"><canvas id="replay-delta-chart"></canvas></div>` 추가.
2. **Chart.js 연동 및 런타임 렌더링 함수 구현**:
   - `openReplay` 시 턴 데이터를 1~12 라운드 단위로 집계하여 라운드별 점수 격차(`Player 1 score - Player 2 score`) 데이터셋 생성.
   - `Chart.js` 라인 차트를 생성하여 0선(Baseline/동점) 기준으로 상단(우세)/하단(열세) 색상 및 채우기 스타일 적용.
   - 모달을 닫을 때 이전 차트 인스턴스 파괴(`chart.destroy()`) 및 재활용 처리.

## Capabilities

### Modified Capabilities

- `web-dashboard`: 턴 복기 모달 상단 라운드별 점수 격차 Delta Line Chart 추가.

## Impact

- `src/presentation/web/dashboardHtml.ts`: 모달 HTML 구조 및 `openReplay` 차트 생성/파괴 JS 전이 처리.
