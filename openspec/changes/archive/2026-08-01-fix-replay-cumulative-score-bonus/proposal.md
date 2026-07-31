## Why

완료된 경기의 실제 최종점수에는 상체 보너스 35점이 포함되지만, `history_json`에는 턴별 획득점수만 저장되어 웹·Discord 복기의 누적점수에서 보너스가 누락됩니다. 또한 raw 턴 점수 합계를 최종점수로 간주하는 레거시 보정 로직이 정상적인 보너스 경기까지 35점 낮출 수 있으므로, 경기 기록의 점수 의미를 일관되게 정리해야 합니다.

## What Changes

- `TurnRecord`에 턴 완료 후 플레이어의 보너스 포함 누적점수(`cumulativeScore`)를 저장합니다.
- 상체 보너스가 발동하는 턴과 이후 턴의 history 누적점수가 실제 `PlayerState.totalScore`와 일치하도록 합니다.
- Discord `/history` 상세 로그와 웹 복기 표·점수 격차·라운드 그래프가 저장된 누적점수를 사용하도록 개선합니다.
- `cumulativeScore`가 없는 기존 history JSON도 상체 보너스를 재계산해 올바르게 표시하는 하위 호환 경로를 추가합니다.
- 레거시 매치 점수 보정 로직이 raw 턴 점수 합계를 최종점수로 오인하지 않도록 수정하고, 보너스가 반영된 기록을 안전하게 식별·복구할 수 있게 합니다.
- 보너스 발동, history 직렬화, Discord/웹 복기, 레거시 데이터 보정에 대한 회귀 테스트를 추가합니다.

## Capabilities

### New Capabilities

없음.

### Modified Capabilities

- `yacht-state-machine`: 턴 기록에 보너스 포함 누적점수의 의미와 저장을 추가합니다.
- `persistence-repository`: `history_json`이 턴 획득점수뿐 아니라 보너스 포함 누적점수를 보존하도록 요구사항을 확장합니다.
- `web-dashboard`: 복기 표와 점수 격차/그래프가 보너스 포함 누적점수를 표시하도록 변경합니다.
- `game-orchestrator`: Discord `/history` 상세 로그에 턴별 누적점수를 표시하도록 변경합니다.
- `d1-database-schema`: 매치 요약점수와 history의 일관성 기준을 raw 점수 합계가 아닌 보너스 포함 최종 누적점수로 변경합니다.

## Impact

- 도메인: `src/domain/types.ts`, `src/domain/game.ts` 및 관련 unit test
- Discord/UI: history serializer와 `src/presentation/web/dashboardHtml.ts`
- 분석/보정: `src/application/LegendMatches.ts`, `scripts/fix-legacy-match-scores.ts`
- 데이터: 새 history는 추가 필드를 저장하며, 기존 history는 fallback 계산으로 읽습니다. `matches` 테이블에 새 컬럼을 추가하지 않습니다.
- 검증: 기존 104개 테스트와 TypeScript 검사에 더해 누적점수·상체 보너스 회귀 테스트를 추가합니다.
