## Context

현재 복기 모달은 턴 바이 턴 표 형태로 획득 점수, 누적 점수, 턴별 Δ Diff를 표시하고 있으나, 1~12 라운드 전체 흐름에서 누구로 주도권이 기울었는지 및 역전 지점을 한눈에 조망할 수 있는 종합 시각화 그래픽이 부재합니다.

## Goals / Non-Goals

**Goals:**
- LCK 골드 격차 그래프 형태의 라운드별 점수 격차 Delta Line Chart 렌더링.
- 1R~12R X축 산정 및 0선(동점 baseline) 중심의 라인 차트 구현.
- 싱글 모드 경기 시 차트 숨김 및 멀티플레이 매치 모드 시 차트 표출.
- 모달 재오픈 시 Chart.js 인스턴스 깔끔한 파괴(`destroy()`) 및 재생성.

**Non-Goals:**
- 실시간 게임 진행 중의 턴별 그래프 (복기 모달 전용).

## Decisions

### 1. 라운드별 점수 격차 산출 알고리즘
- 턴 목록을 순회하며 라운드(`turnNumber` 1~12)별로 각 플레이어의 해당 라운드 종료 시점 누적 점수를 추적.
- `roundDiffs[round] = p1Cumulative - p2Cumulative`
- X축 레이블: `['1R', '2R', '3R', '4R', '5R', '6R', '7R', '8R', '9R', '10R', '11R', '12R']`

### 2. UI 및 Chart.js 바인딩
- `#replay-modal` 내 테이블 상단에 캔버스 카드 배치 (`height: 180px`).
- 싱글 모드일 경우 `display: none`, 멀티 모드일 경우 차트 영역 표출.
- Chart.js 설정:
  - `type: 'line'`
  - `borderColor`: `#60a5fa` (Player1 lead 시) 및 0선 기준 그라데이션 적용
  - `tension: 0.35` (부드러운 스무스 커브)
  - `scales.y`: `suggestedMin: -30`, `suggestedMax: 30`, grid zeroLine 강조.
