## 1. Setup & Configuration

- [x] 1.1 **[사용자 수행]** Discord Developer Portal에서 봇 토큰을 발급받아 Cloudflare Wrangler Secret으로 `DISCORD_BOT_TOKEN`을 등록합니다. (로컬 테스트 시 `.dev.vars` 파일에 `DISCORD_BOT_TOKEN="your_token"` 추가)
- [x] 1.2 `src/index.ts`의 `fetch` 핸들러 `env` 매개변수 타입에 `DISCORD_BOT_TOKEN: string` 속성을 추가합니다.
- [x] 1.3 `src/presentation/discord/adapter/types.ts`의 `ParsedInteraction` 구조체 정의에 `channelId: string | null` 필드를 추가합니다.
- [x] 1.4 `src/presentation/discord/adapter/parser.ts`에서 디스코드 웹훅 페이로드로부터 `channel_id`를 추출하여 `ParsedInteraction`에 넘겨주도록 코드를 수정합니다.

## 2. Discord API Service Layer

- [x] 2.1 `src/presentation/discord/adapter` 폴더 하위에 `DiscordApiService` 인터페이스 및 Context Tag를 정의합니다. (멘션 발송 `sendMention` 및 메시지 삭제 `deleteMessage` 메서드 포함)
- [x] 2.2 `DiscordApiServiceLive` 레이어를 구현합니다. `DISCORD_BOT_TOKEN`을 주입받아 Discord REST API (`POST /channels/{id}/messages` 및 `DELETE /channels/{id}/messages/{msg_id}`)를 호출하며, 삭제 시 발생하는 404 에러를 안전하게 캐칭하여 성공으로 복구합니다.
- [x] 2.3 `src/index.ts`에서 `DiscordApiServiceLive` 레이어를 메인 프로그램의 Layer에 병합하고 제공합니다.
- [x] 2.4 로컬 시뮬레이션용 Mock 레이어를 정의하여 `vitest` 유닛 테스트 실행 시 디스코드 API 호출을 가로채고 메모리에서 동작을 추적할 수 있도록 합니다.

## 3. GameState & Domain Update

- [x] 3.1 `src/domain/types.ts`의 `GameState` 인터페이스에 `lastMentionMessageId?: string` 및 `lastMentionChannelId?: string` 필드를 선택적 속성(Optional)으로 추가합니다.

## 4. Mention Handler Integration

- [x] 4.1 `src/index.ts` 내의 `customId === "select_category"` 로직에서 다음 플레이어의 턴으로 전환될 때 (`mode === "multi"` 이고 `status !== "Finished"`인 경우):
  - 백그라운드 태스크(`ctx.waitUntil`)를 실행하여 `DiscordApiService.sendMention`으로 다음 플레이어에게 멘션 메시지를 보냅니다.
  - 리턴받은 `messageId`와 `channelId`를 `nextState`에 업데이트한 후 `gameRepo.save()`로 D1에 영구 보존합니다.
  - 이전에 보낸 멘션 메시지가 남아 있다면 (`lastMentionMessageId`가 존재한다면) 먼저 이를 비동기적으로 삭제하도록 연동합니다.
- [x] 4.2 `src/index.ts` 내의 `roll_` 및 `hold_` 컴포넌트 인터랙션 처리 로직에서:
  - 갱신 전 `gameState`에 `lastMentionMessageId`가 기록되어 있는지 확인합니다.
  - 기록되어 있다면 `ctx.waitUntil`을 사용해 백그라운드에서 `DiscordApiService.deleteMessage`를 요청합니다.
  - DB에 상태를 저장하기 전에 `lastMentionMessageId`와 `lastMentionChannelId` 필드를 초기화(undefined)하여 `gameRepo.save()`로 업데이트합니다.

## 5. Verification & Testing

- [x] 5.1 `src/presentation/discord/adapter/adapter.test.ts`에 `channel_id` 파싱 검증 유닛 테스트 케이스를 추가하고 성공 여부를 검증합니다.
- [x] 5.2 Mock `DiscordApiService` 환경에서, 플레이어가 카테고리를 선택할 때 멘션 메시지 데이터가 쌓이고 주사위를 굴릴 때 멘션 메시지가 삭제를 호출하는 동작 흐름에 대한 비즈니스 로직 테스트를 구현합니다.
- [x] 5.3 `npm run test`를 실행하여 모든 기존 유닛 테스트와 새로 작성한 유닛 테스트가 통과하는지 확인합니다.
