## Why

디스코드 야추 게임의 실제 사용자로부터 5가지 피드백이 접수되었다. 모바일 환경에서의 스코어보드 깨짐, 보너스 기준점수의 불투명함, 전체 홀드 상태에서의 무의미한 롤 허용, 게임 종료 시 알림 부재, 그리고 경쟁 심화를 위한 ELO 레이팅 시스템 요구가 핵심이다. 현재 모바일 디스코드에서 코드블록이 줄바꿈되어 스코어보드가 심각하게 깨지는 문제는 사용자 경험을 크게 저해하고 있으며, 즉시 개선이 필요하다.

## What Changes

- **스코어보드 모바일 최적화**: 코드블록 가로 너비를 39자→27자로 축소하여 모바일 디스코드에서 줄바꿈 없이 정상 표시되도록 개선. 닉네임 최대 4글자 제한, 카테고리 레이블 단축.
- **보너스 기준점수 표기**: Subtotal 행에 상단 섹션 합산/기준점수(63)를 진행률 형태(`0/63`)로 표기하여 보너스 달성 현황을 직관적으로 확인 가능하도록 개선.
- **전체 홀드 롤 방지**: 5개 주사위를 모두 홀드한 상태에서 Roll Dice 버튼을 비활성화(disabled)하여 롤 기회 낭비를 방지. 도메인 레이어에도 `AllDiceHeldError` 가드를 추가하여 이중 방어.
- **게임 종료 승자 알림**: 게임 종료 시 별도의 디스코드 메시지를 전송하여 승자를 @멘션으로 알림. 원본 게임 메시지에 reply로 연결.
- **ELO 레이팅 시스템**: 멀티플레이어 매치 종료 시 Elo 평점을 계산·갱신하는 시스템 도입. 기본값 1000, K-factor 32, 최저값 100. 멀티 리더보드를 Elo 순으로 정렬 변경. 프로필에도 Elo 표시.

## Capabilities

### New Capabilities
- `elo-rating`: Elo 평점 계산(순수 함수), DB 스키마 확장(elo 칼럼), 멀티 매치 종료 시 평점 갱신, 리더보드/프로필에 Elo 노출을 포괄하는 기능.

### Modified Capabilities
- `yacht-state-machine`: 전체 홀드 상태(`holds = [true,true,true,true,true]`)에서 롤을 차단하는 도메인 가드 및 `AllDiceHeldError` 추가.
- `finished-game`: 게임 종료 시 별도 디스코드 메시지로 승자 @멘션 알림 전송. `DiscordApiService`에 `sendGameEndMessage` 추가.
- `d1-database-schema`: `players` 및 `guild_player_stats` 테이블에 `elo` 칼럼(INTEGER, DEFAULT 1000) 추가 마이그레이션.

## Impact

- **Domain Layer**: `src/domain/elo.ts` 신규 생성 (순수 함수), `src/domain/game.ts` rollDice 가드 추가, `src/domain/errors.ts` AllDiceHeldError 추가
- **Persistence Layer**: `migrations/0006_add_elo_rating.sql` 신규, `src/persistence/repository.ts` PlayerStats에 elo 필드·updateElo 메서드 추가, `src/persistence/d1/repository.ts` SQL 쿼리 수정
- **Presentation Layer**: `src/presentation/discord/adapter/serializer.ts` formatScoreBoard 전면 개편 (모바일 최적화, 보너스 표기), 리더보드/프로필 Elo 표시, Roll 버튼 disabled 조건 추가. `src/presentation/discord/adapter/api.ts` sendGameEndMessage 메서드 추가
- **Orchestration**: `src/index.ts` 게임 종료 분기에 Elo 계산·저장·알림 로직 추가
- **Tests**: `src/domain/elo.test.ts` 신규, 기존 game.test.ts에 AllDiceHeld 케이스 추가
