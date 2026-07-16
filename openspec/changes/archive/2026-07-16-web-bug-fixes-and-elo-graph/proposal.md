## Why

현재 야추 다이스 웹 대시보드 및 명예의 전당 페이지에 몇 가지 버그와 편의성 아쉬움이 있습니다.
1. 경기 복기 창에서 상대방 플레이어를 클릭해도 모달만 닫히고 프로필 화면이 갱신되지 않는 현상이 발생합니다.
2. 디스코드 길드 정보(`guildId`) 없이 웹 대시보드에 접근했을 때 최근 경기 이력과 평균 점수가 모두 0점 또는 빈 목록으로 조회됩니다.
3. 턴 바이 턴 복기 시 두 플레이어의 점수가 구분되지 않고 현재 누적 점수도 표시되지 않아 경기 양상을 한눈에 보기 어렵습니다.
4. 플레이어 프로필에서 ELO의 상승/하락 변화 추이를 직관적으로 파악할 수 있는 시각적 그래프가 제공되지 않습니다.

이 문제를 해결하고 사용자 경험을 개선하기 위해 대시보드 웹 UI를 개선하고 ELO 변동 추이 그래프를 도입하고자 합니다.

## What Changes

- **복기 모달 링크 동작 개선**: 복기 화면에서 플레이어 이름 클릭 시 모달이 닫히며 해당 플레이어의 프로필 탭이 활성화되고 전적이 정상 로드되도록 수정합니다.
- **웹 프로필 매치/통계 조회 쿼리 수정**: `guildId`가 제공되지 않는 경우(전체 조회), `guild_id IS NULL` 조건 대신 전체 matches 기록을 조회하도록 D1 쿼리를 유연하게 변경합니다.
- **복기 모달 테이블 UI 개선**:
  - 누적 점수(Cumulative Score) 컬럼을 추가합니다.
  - 플레이어 1과 2의 행 배경색을 구분하고 이름 왼쪽에 고유한 식별 도트(Blue / Green)를 삽입합니다.
  - 획득 점수에 0점(뇌절/삭), 일반 득점, 고득점(야추 등) 구간별로 맞춤형 색상 및 글로우 효과를 적용합니다.
- **ELO 히스토리 기록 및 그래프 시각화**:
  - **BREAKING (Schema Change)**: `matches` 테이블에 `player1_elo_after`, `player2_elo_after` 컬럼을 추가하는 D1 마이그레이션을 진행합니다.
  - 경기 종료 시점(`endGame`, `surrenderGame`)에 ELO 등급 변동을 선계산하여 `matches` 레코드와 함께 데이터베이스에 기록합니다.
  - 웹 대시보드에 Chart.js CDN을 추가하고, 프로필 탭에 최근 경기 ELO 변동 추이를 볼 수 있는 반응형 선 그래프 영역을 구현합니다.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `web-dashboard`: 프로필 탭 이동 핸들링, 누적 점수 컬럼 및 컬러 테이밍 적용, Chart.js 활용 ELO 추이 그래프 추가, 그리고 `guildId`가 주어지지 않을 시 전체 데이터 조회 처리.
- `d1-database-schema`: `matches` 테이블에 각 플레이어의 경기 후 ELO 점수를 저장하기 위한 `player1_elo_after` 및 `player2_elo_after` 컬럼 추가.

## Impact

- **Database (`D1`)**: `matches` 테이블에 새 컬럼 2개 추가 (`player1_elo_after`, `player2_elo_after`).
- **Domain (`MatchRecord`)**: `MatchRecord` 타입 정의 변경 및 D1 리포지토리의 저장/매핑 함수 수정.
- **Application (`GameWorkflowService`)**: 경기 종료 로직에서 ELO 변동 결과를 `saveMatch` 이전에 미리 계산하여 저장하도록 갱신.
- **Presentation (`dashboardHtml.ts`)**: 탭 전환 기능 확장, 복기 모달 마크업/스타일/JS 갱신, Chart.js 탑재 및 렌더링 스크립트 작성.
