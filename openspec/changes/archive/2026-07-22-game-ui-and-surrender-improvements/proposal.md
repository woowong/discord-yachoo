## Why

유저 피드백을 반영하여 경기 복기 시 스코어 분석을 용이하게 만들고, 주사위를 굴리는 동안 버튼 라벨 불일치로 발생하는 Discord UI 레이아웃 일렁임 현상을 해결합니다. 또한, 상대방의 동의를 구하는 항복 수락(Surrender Offer & Accept) 플로우를 도입하여 게임의 매너와 인터랙션 경험을 개선합니다.

## What Changes

1. **주사위 Rolling 애니메이션 UI 표기 통일**:
   - 주사위를 굴릴 때 비활성화(`disabled: true`)되는 주사위 고정 버튼 라벨을 일반 대기 상태와 동일하게 `isHeld ? "🔒" : [idx + 1]`로 일관되게 렌더링하여 주사위를 굴릴 때 버튼 크기/라벨 변형으로 인한 UI 덜컥거림을 제거합니다.
2. **상대방 항복 수락 기능 (Surrender Proposal & Accept)**:
   - 플레이어가 항복을 시도할 때 상대방에게 항복 수락/거절을 제안하는 메시지(`[🤝 수락]`, `[❌ 거절]`)를 생성합니다.
   - 제안을 받은 상대방만 수락/거절 버튼을 누를 수 있으며, 수락 시 게임이 항복 승리로 종료되고 거절 시 게임이 계속 진행됩니다.
3. **경기 복기 스코어 컬럼 및 점수 차이(Δ Diff) 보강**:
   - 웹 대시보드의 복기 모달 턴 목록에 상대와의 누적 점수 차이(Lead/Lag) 정보를 추가하여 역전 양상을 더욱 직관적으로 파악할 수 있도록 보강합니다.

## Capabilities

### Modified Capabilities

- `yacht-state-machine`: 항복 제안(Surrender Offer) 대기 상태 및 수락/거절 전이 로직 추가.
- `game-orchestrator`: 주사위 Rolling 시 버튼 라벨 통일 렌더링 및 항복 제안/수락/거절 Component Interaction 핸들러 처리.
- `web-dashboard`: 복기 모달에 스코어 차이(Δ Diff) 컬럼 및 시각적 강조 보강.

## Impact

- **Core Engine & Types**: `InProgressGameState` 및 `GameState`에 `pendingSurrenderOfferByPlayerId` 필드가 추가되며, `surrenderGame` 도메인 함수 인터페이스 및 전이가 업데이트됩니다.
- **Discord Presentation**: `serializer.ts` 내 주사위 버튼 렌더링 로직 수정 및 항복 관련 Component Custom ID (`offer_surrender`, `accept_surrender`, `decline_surrender`) 처리 핸들러 추가.
- **Web Presentation**: `dashboardHtml.ts` 내 복기 모달 HTML 및 JS 렌더링 수정.
