## Why

멀티플레이어 항복 수락 흐름에서 항복 제안 상태가 사라진 뒤에도 오래된 수락 버튼을 처리할 수 있습니다. 이때 수락자를 항복자로 대체하는 fallback 때문에, A가 항복을 제안하고 B가 수락했는데 B가 패배자로 기록될 수 있습니다. 항복은 현재 턴과 무관하게 제안자가 패배한다는 규칙이므로, 제안자와 수락자를 끝까지 분리해 보장해야 합니다.

## What Changes

- 항복 제안 시 저장된 제안자 ID를 항복 확정의 유일한 기준으로 사용합니다.
- 유효한 항복 제안이 없거나 이미 취소된 제안의 수락/거절 버튼은 게임 상태를 변경하지 않고 만료된 제안 오류를 반환합니다.
- 항복 수락/거절은 게임 참가자 중 제안자의 상대방만 수행할 수 있도록 검증합니다.
- 항복 제안, 수락, 거절은 현재 `currentPlayerIndex`나 주사위 진행 상태에 의해 제한되지 않도록 명시합니다.
- 일반 턴 진행으로 항복 제안이 취소된 경우 기존 Discord 버튼도 더 이상 게임을 종료할 수 없도록 통합 테스트를 추가합니다.
- 항복 수락 시 매치 기록, 승패, ELO, 게임 보드 종료 상태가 모두 제안자 패배 기준으로 일관되게 처리되는지 검증합니다.

## Capabilities

### New Capabilities

없음.

### Modified Capabilities

- `yacht-state-machine`: 항복 제안자/수락자 식별과 만료된 항복 제안의 상태 전이를 명확히 합니다.
- `game-orchestrator`: Discord 항복 수락·거절 권한 검증과 stale interaction 무효화를 명확히 합니다.

## Impact

- `src/domain/game.ts`, `src/domain/types.ts`: 항복 제안 상태 전이와 검증.
- `src/application/GameWorkflowService.ts`: 수락 시 제안자 ID를 보존하고 도메인 검증을 우회하지 않도록 수정.
- `src/presentation/discord/handlers/components.ts`: 상대방 권한 및 만료된 버튼 응답 처리.
- `src/presentation/discord/router.ts` 및 통합 테스트: 항복 component interaction 경로 검증.
- D1 스키마 변경은 필요하지 않으며, 기존 `active_games.state` JSON의 pending 항복 제안 상태를 사용합니다.
