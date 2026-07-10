## 1. Type Definitions & Parser Extension

- [x] 1.1 `src/presentation/discord/adapter/types.ts`에서 `DiscordEmbed` 인터페이스에 `image?: { readonly url: string }` 필드 정의 추가
- [x] 1.2 `src/presentation/discord/adapter/types.ts`에서 `ParsedInteraction` 타입에 `applicationId` 및 `token` 필드 추가
- [x] 1.3 `src/presentation/discord/adapter/parser.ts`에서 수신되는 Interaction JSON에서 `application_id`와 `token`을 파싱하여 `ParsedInteraction`에 매핑하도록 업데이트

## 2. Serializer UI 개선 (이모지 & 롤링 화면)

- [x] 2.1 `src/presentation/discord/adapter/serializer.ts`의 `DICE_UNICODE`를 가독성이 높은 디스코드 텍스트용 이모지 배열(`DICE_EMOJIS`: `:one:`~`:six:`)로 교체
- [x] 2.2 `serializer.ts`에 버튼 아이콘용 유니코드 이모지 배열(`DICE_BUTTON_EMOJIS`: `1️⃣`~`6️⃣`) 상수 정의 추가
- [x] 2.3 `serializer.ts` 내 `DiscordResponseSerializer`에 `serializeRolling: (state: GameState, holds?: string) => DiscordInteractionResponse` 메서드 정의 및 구현 추가 (모든 컴포넌트 비활성화, 롤링 GIF 이미지 포함)
- [x] 2.4 `serializer.ts` 내 `serializeGame`의 주사위 홀드 버튼 객체에 `emoji: { name: DICE_BUTTON_EMOJIS[val] }` 프로퍼티 추가 및 롤 버튼 객체에 `emoji: { name: "🎲" }` 프로퍼티 추가

## 3. Worker Entrypoint 비동기 롤링 연출 구현

- [x] 3.1 `src/index.ts`의 `fetch` 핸들러 인자에 `ctx: ExecutionContext` 파라미터를 추가하고, `handleInteraction`으로 전달하도록 수정
- [x] 3.2 `src/index.ts` 내 `handleInteraction` 함수가 `ctx`를 받도록 서명 수정
- [x] 3.3 `src/index.ts` 내 `roll_` 분기문 수정:
  - 주사위 롤링 후 `gameRepo.save(nextState)`는 기존대로 먼저 수행
  - `serializer.serializeRolling(gameState, holds)`을 통해 모든 버튼이 잠긴 롤링용 UI 직렬화 후 HTTP 응답 즉시 반환
  - `ctx.waitUntil`을 사용해 백그라운드 태스크 기동
- [x] 3.4 백그라운드 태스크 구현:
  - `Effect.sleep("1.4 seconds")` 대기
  - Discord REST Webhook PATCH API (`https://discord.com/api/v10/webhooks/${applicationId}/${token}/messages/@original`)를 호출하여 최종 보드 상태(`nextState`)로 메시지 수정 업데이트 수행

## 4. 검증 및 테스트

- [x] 4.1 기존 유닛 테스트(`vitest`) 실행을 통해 직렬화 및 파서 관련 로직이 깨지지 않았는지 검증
- [x] 4.2 직렬화 테스트 코드(`adapter.test.ts`)의 기대값에 이모지 관련 필드가 올바르게 포함되는지 확인 및 수정
