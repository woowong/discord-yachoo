## 1. Domain & Type Definition

- [x] 1.1 `src/domain/types.ts`의 `GameState` 인터페이스에 `surrenderedPlayerId?: string` 필드 추가
- [x] 1.2 `src/domain/game.ts`에 `surrenderGame` 도메인 함수 구현 및 export
- [x] 1.3 `src/domain/game.test.ts`에 `surrenderGame`에 대한 기권 성공, 실패 예외 검증 단위 테스트 작성 및 통과 확인

## 2. Presentation Layer Adjustment

- [x] 2.1 `src/presentation/discord/adapter/serializer.ts`의 `serializeGame`에서 게임 진행 중일 경우 Danger(Red, style 4) 스타일의 `🏳️ 기권 (Surrender)` 버튼을 🎲 버튼 옆에 배치
- [x] 2.2 `serializer.ts`의 `serializeRolling` 내에서도 주사위 롤링 중일 때의 비활성화된 기권 버튼 UI 렌더링 반영
- [x] 2.3 `serializeGame` 내의 기권으로 인한 조기 종료(`surrenderedPlayerId`가 존재하는 Finished) 상태 시 최종 결과 임베드 설명 문구 템플릿 수정

## 3. Controller Implementation & Refactoring

- [x] 3.1 `src/index.ts`의 `Component` 인터랙션 핸들링 부분에서 턴 소유권 체크(`Validate turn`) 진입 이전에 `customId === "surrender"` 입력을 가로채어 권한 확인(참여 플레이어 여부) 및 처리 라우팅 추가
- [x] 3.2 `src/index.ts`에 산재되어 있던 게임 종료 후속 처리(Match DB 저장, Elo 계산 및 변동 사항 D1 갱신, 알림 전송) 로직을 `handleGameEnd` 헬퍼 Effect로 통합 추출
- [x] 3.3 기권 종료 시 기권한 측이 패배하고 상대방이 이기도록 `winnerId` 판정 및 Elo `outcome` 계산을 조정하여 `handleGameEnd` 호출 연동
- [x] 3.4 `src/index.ts`의 다이스 롤링 연출 연기용 `Effect.sleep` 대기 시간을 기존 `"1.4 seconds"`에서 `"1.2 seconds"`로 수정
- [x] 3.5 `src/index.ts`의 `/challenge` 커맨드 처리 시 본인 대전 신청(self-challenge)에 대한 유효성 검사 및 에러 응답 로직 구현

## 5. Testing & Verification

- [x] 4.1 `vitest` 테스트 명령어를 구동하여 작성된 비즈니스 규칙과 기존 시스템 테스트들이 100% 통과하는지 검증
- [x] 4.2 `src/index.test.ts`에 자기 자신에게 대전 신청 시 에러 메시지를 반환하는지에 대한 통합 테스트 추가

