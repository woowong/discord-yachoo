## 1. Discord API Adapter Modification

- [x] 1.1 `src/presentation/discord/adapter/api.ts`에서 `DiscordApiService` 인터페이스의 `sendMention` 메서드 시그니처에 선택적 매개변수 `replyToMessageId?: string`를 추가합니다.
- [x] 1.2 `DiscordApiServiceLive` 레이어의 `sendMention` 구현체에서 `replyToMessageId`가 존재할 때 `message_reference` 객체 및 `fail_if_not_exists: false` 옵션을 함께 전달하도록 fetch 요청 Body를 수정합니다.
- [x] 1.3 `DiscordApiServiceMockLive` 레이어의 `sendMention` 모의 구현체가 바뀐 시그니처를 지원하도록 매개변수를 추가합니다.

## 2. Interaction Handler Integration

- [x] 2.1 `src/index.ts`의 `handleInteraction` 함수 내 턴 전환 멘션 발송 로직에서 세 번째 인자로 원본 메시지 ID인 `rawJson.message?.id`를 넘겨주도록 연동합니다.

## 3. Testing and Verification

- [x] 3.1 `src/index.test.ts`에 존재하는 Mock `DiscordApiService`와 테스트 케이스 내 Mock setup들을 새로운 시그니처와 일치하게 수정합니다.
- [x] 3.2 턴 전환 멘션이 전송될 때 올바른 메시지 ID를 답장(Reply) 대상으로 명시하여 전송하는지 검증하는 테스트 케이스를 `src/index.test.ts`에 추가합니다.
- [x] 3.3 로컬에서 테스트 (`npm run test`)를 수행하여 전체 테스트가 성공하는지 확인합니다.
