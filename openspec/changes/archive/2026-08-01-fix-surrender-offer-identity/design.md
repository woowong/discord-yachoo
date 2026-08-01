## Context

현재 멀티플레이어 항복 흐름은 `pendingSurrenderOfferByPlayerId`에 제안자를 저장하지만, 수락 워크플로가 해당 값이 없을 때 수락자 ID를 항복자로 사용하는 fallback을 갖고 있습니다. 또한 실제 수락 경로가 도메인의 수락 검증을 우회하여, 제안 상태·응답자 권한·stale component를 일관되게 검증하지 못합니다. 관련 도메인 단위 테스트는 정상적인 A 제안/B 수락만 검증하고 실제 Discord 오케스트레이션 경로는 검증하지 않습니다.

## Goals / Non-Goals

**Goals:**

- 항복 제안자의 ID를 수락자의 ID와 분리하고, 수락 결과의 유일한 항복자 기준으로 유지합니다.
- 현재 턴, 현재 플레이어, 롤링/스코어링 단계와 무관하게 항복 제안을 허용합니다.
- 제안이 없거나 취소된 accept/decline interaction을 안전하게 무효화합니다.
- 수락자는 현재 게임의 유일한 상대방이어야 하며, 모든 종료 기록과 통계가 제안자 패배로 연결되도록 합니다.
- 순수 도메인 전이와 Application/Discord 검증 경계를 테스트합니다.

**Non-Goals:**

- 항복 제안의 만료 시간을 새로 도입하지 않습니다.
- 항복 제안 메시지의 공개/ephemeral 표시 정책을 변경하지 않습니다. 기존의 제안 전 확인 메시지와 상대방 수락/거절 UI 정책은 유지합니다.
- D1 스키마나 `GameState`의 별도 offer token 저장 구조를 추가하지 않습니다.

## Decisions

### 1. Persisted pending proposer is the source of truth

수락 시 수락자의 ID를 항복자로 추론하거나 fallback으로 사용하지 않습니다. 최신 게임 상태의 `pendingSurrenderOfferByPlayerId`가 반드시 존재해야 하며, 이 값이 항복자로 도메인 전이에 전달됩니다. 값이 없으면 `InvalidStateActionError` 계열의 실패로 종료하고 게임 상태를 변경하지 않습니다.

대안으로 Discord `custom_id`에 제안자 ID만 저장하는 방식은 stale 버튼이 최신 상태보다 우선할 수 있으므로 선택하지 않습니다. `custom_id`는 게임 interaction을 찾는 정보일 뿐, 항복자 권한의 최종 근거가 아닙니다.

### 2. Reuse the domain acceptance transition

Application Service는 수락 요청을 직접 `processSurrender`로 변환하지 않고, 도메인의 항복 제안 수락 전이를 통해 다음을 검증합니다.

- 게임이 종료되지 않았는지
- pending 제안이 존재하는지
- 응답자가 게임 참가자인지
- 응답자가 저장된 제안자가 아닌지

검증에 성공한 경우에만 저장된 제안자 ID로 게임을 종료하고, 실패한 경우에는 어떠한 매치/통계/보드 종료 부수효과도 실행하지 않습니다. 기존 공통 종료 처리에는 명시적인 surrendering player ID를 전달하며, 호출자 ID를 암묵적으로 대체하지 않습니다.

### 3. Turn-independent proposal with explicit invalidation

항복 제안은 `currentPlayerIndex`, `rollCount`, `currentDice`, 현재 점수 단계에 영향을 주지 않고 pending ID만 설정합니다. 정상적인 roll/category action이 pending ID를 지우면, 이미 Discord에 표시된 버튼은 stale interaction이 됩니다. 수락/거절 핸들러는 최신 저장 상태를 다시 확인하고 pending ID가 없으면 ephemeral 오류만 반환합니다.

### 4. Authorization at both handler and domain boundaries

Discord 핸들러는 빠른 사용자 피드백을 위해 현재 상태의 상대방 여부를 검사하고, 도메인 함수도 동일한 규칙을 독립적으로 검사합니다. 따라서 핸들러를 우회하거나 다른 Application 호출자가 생겨도 제안자 본인·제3자·게임 외 사용자가 수락/거절할 수 없습니다.

### 5. Test the complete identity path

도메인 테스트에는 현재 턴이 상대방인 상태에서의 제안, 스코어링 상태에서의 제안, 제안자 본인/제3자의 응답, stale 수락을 추가합니다. 통합 테스트에는 A가 제안하고 B가 수락했을 때 `surrenderedId=A`, `winnerId=B`, active game 삭제, 통계/ELO 처리가 함께 발생하는지와 stale 수락에서 B의 `surrenderedId`가 절대 기록되지 않는지를 추가합니다.

## Risks / Trade-offs

- **[Risk]** 제안 상태가 일반 턴 동작으로 취소되면 상대방이 버튼을 눌렀을 때 혼란스러울 수 있음 → **Mitigation**: ephemeral 만료/취소 안내를 반환하고 게임 상태는 변경하지 않습니다.
- **[Risk]** 핸들러와 도메인에 권한 검증이 중복됨 → **Mitigation**: Discord UX를 위한 1차 검사와 순수 도메인 불변식 보장을 분리하고, 동일한 시나리오를 양쪽 테스트에서 검증합니다.
- **[Risk]** 기존 단일 플레이 항복 흐름과 멀티플레이 제안 흐름이 달라질 수 있음 → **Mitigation**: 단일 플레이는 기존 확인 후 즉시 종료를 유지하고, 변경 범위는 멀티플레이 accept/decline 전이에 한정합니다.

## Migration Plan

배포 시 코드 변경만 적용하며 D1 마이그레이션은 필요하지 않습니다. 배포 전 도메인/통합 테스트를 실행하고, 배포 후에는 항복 제안·수락 로그에서 `surrenderedId`가 제안자와 일치하는지 확인합니다. 롤백은 Application/핸들러 변경을 이전 버전으로 되돌리는 방식이며 기존 `pendingSurrenderOfferByPlayerId` JSON 필드는 호환됩니다.
