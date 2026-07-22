## Context

현재 디스코드 야추 다이스 게임 환경 및 웹 대시보드에는 몇 가지 UI/UX 아쉬움이 존재합니다.
1. 주사위 Rolling 애니메이션 도중 주사위 버튼이 `disabled` 처리될 때, 고정된 버튼에 `[1] Held`와 같은 라벨이 나타나 버튼 너비가 순간 변형되며 UI 일렁임이 발생하는 현상.
2. 일방적인 기권만 지원되어, 상대방과의 상호동의 하에 정중한 항복 수락 절차를 밟는 기능의 부재.
3. 웹 대시보드 턴 복기 모달에서 각 턴의 획득/누적 점수만 보이고 상대방 대비 점수 격차 추이가 한눈에 띄지 않는 점.

## Goals / Non-Goals

**Goals:**
- **주사위 Rolling UI 일관성 확보**: `serializeRollingMessage` 내 비활성화 주사위 버튼 라벨을 일반 대기 상태와 동일하게 `isHeld ? "🔒" : [idx + 1]`로 통일하여 Layout Shift 방지.
- **상대방 항복 수락/거절 플로우 도입**:
  - `GameState`에 `pendingSurrenderOfferByPlayerId` 상태 관리.
  - `offerSurrender`, `acceptSurrender`, `declineSurrender` 순수 도메인 함수 구축.
  - 디스코드 상에 수락(`[🤝 수락]`) / 거절(`[❌ 거절]`) 버튼 생성 및 권한 검증.
  - 제안 상태에서도 상대방이 주사위를 굴리거나 카테고리를 선택하면 제안이 자연스럽게 취소되어 게임 진행이 막히지 않도록 처리.
- **복기 모달 점수 격차 렌더링**: 웹 대시보드 복기 모달 테이블에 상대와의 누적 점수 차이(Δ Diff) 표시.

**Non-Goals:**
- 싱글 플레이(Solo) 모드에서의 수락 플로우 (싱글 플레이는 즉시 기권 유지).
- 타이머 기반 자동 항복 거절 (시간 초과 처리 등은 별도 스펙).

## Decisions

### 1. 주사위 Rolling 라벨 통일
- `serializeRollingMessage`의 주사위 버튼 생성 부분을 `serializeGameState`와 똑같이 `label: isHeld ? "🔒" : [idx + 1]`로 일치시킴.
- 이로써 주사위 버튼은 고정 여부(`🔒` / `[1]`)가 주사위 애니메이션 전/후 및 도중에 완벽히 유지됨.

### 2. 항복 제안 (Surrender Offer) & 수락 / 거절 매커니즘
- **상태 관리**: `InProgressGameState`에 `pendingSurrenderOfferByPlayerId?: string` 필드 추가.
- **인터랙션 핸들러**:
  - `offer_surrender_${gameId}`: 항복 제안 발송.
  - `accept_surrender_${gameId}_${proposerId}`: 수락 시 게임 종료 (`surrenderedPlayerId = proposerId`).
  - `decline_surrender_${gameId}_${proposerId}`: 거절 시 `pendingSurrenderOfferByPlayerId` 리셋 후 게임 판 복원.
- **자연스러운 취소 (Auto-clear)**: 항복 제안 상태이더라도 다른 턴 행동(주사위 굴리기, 카테고리 선택)이 실행되면 제안 상태는 자동 해제됨.

### 3. 웹 복기 모달 Δ Diff 표기
- 턴 복기 시 Player 1과 Player 2의 턴별 누적 점수를 누적 배열로 추적하여, 해당 턴 직후의 점수 차이(`Player 1 Score - Player 2 Score`)를 계산하여 표시.

## Risks / Trade-offs

- **[Risk]** 상대방이 항복 제안에 응답하지 않고 방치할 가능성
  - **Mitigation**: 수락/거절 버튼 외에도 차례인 플레이어가 턴 행동(주사위 굴리기/점수 기록)을 진행하면 항복 제안 상태는 자동으로 클리어되므로 게임이 교착 상태에 빠지지 않음.
