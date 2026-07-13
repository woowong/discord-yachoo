## 1. Domain Layer: Elo 계산 및 AllDiceHeld 가드

- [x] 1.1 `src/domain/elo.ts` 생성 — `calculateExpectedScore(rA, rB)`, `calculateEloChange(ratingA, ratingB, outcomeA, K=32)` 순수 함수 구현. 최저값 100 가드 포함.
- [x] 1.2 `src/domain/elo.test.ts` 생성 — 동일 레이팅 승/패/무, 언더독 승리, 최저값 100 바닥 등 엣지 케이스 테스트.
- [x] 1.3 `src/domain/errors.ts`에 `AllDiceHeldError` 클래스 추가 및 `GameError` 유니온 타입에 포함.
- [x] 1.4 `src/domain/game.ts` `rollDice` 함수에 전체 홀드(`holds` 모두 true) 시 `AllDiceHeldError` 반환 가드 추가. 첫 번째 롤(rollCount === 0)에서는 holds를 무시하므로 가드 미적용.
- [x] 1.5 `src/domain/game.test.ts`에 전체 홀드 롤 방지 시나리오 테스트 추가.

## 2. Persistence Layer: DB 스키마 및 Repository 확장

- [x] 2.1 `migrations/0006_add_elo_rating.sql` 생성 — `players`와 `guild_player_stats` 테이블에 `elo INTEGER NOT NULL DEFAULT 1000` 칼럼 추가.
- [x] 2.2 `src/persistence/repository.ts` `PlayerStats` 인터페이스에 `elo: number` field 추가.
- [x] 2.3 `src/persistence/repository.ts` `PlayerRepository` 인터페이스에 `updateElo(id: string, guildId: string | null, newElo: number)` 메서드 추가.
- [x] 2.4 `src/persistence/d1/repository.ts` D1 구현체 수정 — `mapRowToPlayerStats`에 elo 매핑, `getPlayer` SQL에 elo 칼럼 추가, `getLeaderboard` 멀티 모드 정렬 기준을 `elo DESC`로 변경, `updateElo` 메서드 구현.
- [x] 2.5 `src/persistence/memory/` 메모리 구현체는 존재하지 않으므로 변경 불필요 (D1 구현체만 사용).

## 3. Presentation Layer: 스코어보드 모바일 최적화

- [x] 3.1 `src/presentation/discord/adapter/serializer.ts` `CATEGORIES` 배열 레이블 단축 — `4 of a Kind` → `4-Kind`, `Full House` → `F.House`, `Small Str.` → `S.Str.`, `Large Str.` → `L.Str.`
- [x] 3.2 `src/presentation/discord/adapter/serializer.ts` `formatScoreBoard` 함수 전면 개편 — 닉네임 4글자 제한, 점수 5자 폭, 가로 27자 이내, Subtotal 행 `현재/63` 진행률 형태 표기, Bonus 행 `(35)` 레이블 포함.
- [x] 3.3 모바일 렌더링 확인용 단위 테스트 — 모든 행이 27자 이내인지 검증하는 테스트 추가 (adapter.test.ts 또는 별도 테스트).

## 4. Presentation Layer: Roll 버튼 비활성화

- [x] 4.1 `src/presentation/discord/adapter/serializer.ts` `serializeGame` 메서드에서 Roll Dice 버튼 생성 시 `holds === "11111"` 조건 추가하여 `disabled: true` 설정.
- [x] 4.2 `src/presentation/discord/adapter/serializer.ts` `serializeRolling` 메서드에서도 동일한 전체 홀드 비활성화 조건 반영.

## 5. Presentation Layer: 승자 알림 및 Elo 표시

- [x] 5.1 `src/presentation/discord/adapter/api.ts` `DiscordApiService` 인터페이스에 `sendGameEndMessage(channelId, content, replyToMessageId?)` 메서드 추가 및 Live/Mock 구현.
- [x] 5.2 `src/presentation/discord/adapter/serializer.ts` `serializeLeaderboard` 메서드 수정 — 멀티 모드에서 Elo 순 정렬 결과를 표시하고, 각 항목에 Elo 점수 포함.
- [x] 5.3 `src/index.ts` 프로필 커맨드(`/profile`) 출력에 Elo 표시 추가 (`⚔️ Matching Mode` 섹션에 `• Elo Rating: **{elo}**` 추가).

## 6. Orchestration: 게임 종료 플로우 통합

- [x] 6.1 `src/index.ts` 게임 종료 분기(L360-411)에서 멀티 모드일 때 양 플레이어의 현재 Elo 조회 → `calculateEloChange` 호출 → `playerRepo.updateElo` 저장 플로우 추가.
- [x] 6.2 `src/index.ts` 게임 종료 분기에서 `DiscordApiService.sendGameEndMessage`를 `ctx.waitUntil`로 호출하여 승자 알림 메시지 전송. 멀티(승리/무승부), 솔로 각각 메시지 포맷 분기.
- [x] 6.3 승자 알림 메시지에 Elo 변동 포함 (e.g., "Elo 1016 ▲+16").
- [x] 6.4 `src/index.ts` 롤 핸들러(L266)에서 `AllDiceHeldError` 에러 핸들링 추가 — 에러 시 ephemeral 메시지로 안내 또는 기존 상태 재렌더링.

## 7. 검증 및 마이그레이션

- [x] 7.1 `npx vitest run` 전체 테스트 통과 확인.
- [x] 7.2 `npx wrangler d1 migrations apply yacht_dice --local`로 로컬 D1에 마이그레이션 적용 확인.
- [x] 7.3 로컬 시뮬레이터(CLI 콘솔)에서 전체 플로우 수동 확인 (가능한 범위 내).
