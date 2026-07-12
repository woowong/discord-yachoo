## Why

현재 게임의 턴 알림(멘션) 메시지가 디스코드 채널에 일반 메시지로 발송되어, 여러 개의 게임이 동시에 진행되거나 다른 메시지가 섞여 있을 때 사용자가 어떤 게임 세션의 턴 알림인지 한눈에 알기 어렵습니다. 멘션 메시지를 해당 게임판 메시지(원본 인터랙션 메시지)에 대한 **답장(Reply)** 형태로 발송하면, 사용자가 멘션을 눌러서 해당 게임 메시지로 바로 이동할 수 있어 사용자 경험이 대폭 향상됩니다.

## What Changes

- **Discord API 멘션 발송에 답장(Reply) 기능 지원**: `DiscordApiService.sendMention`에 선택적 매개변수로 `replyToMessageId`를 추가하고, Discord API 호출 시 `message_reference` 객체를 포함시킵니다.
- **턴 전환 시 원본 메시지 ID 전달**: `src/index.ts`에서 게임 턴이 전환되어 멘션을 보낼 때, 현재 Interaction의 원본 메시지 ID(`rawJson.message?.id`)를 멘션 발송 서비스에 전달합니다.
- **안전장치 추가**: 원본 게임판 메시지가 삭제된 경우에도 멘션 전송이 실패하지 않도록 `fail_if_not_exists: false` 옵션을 지정합니다.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `turn-mention-notification`: 턴 멘션 발송 시 해당 게임의 원본 메시지에 대한 답장(Reply) 형태로 전송하도록 요구사항을 개선합니다.

## Impact

- `src/presentation/discord/adapter/api.ts`: `DiscordApiService` 인터페이스 및 그 구현체(`DiscordApiServiceLive`, `DiscordApiServiceMockLive`)에 `replyToMessageId?: string` 매개변수 적용
- `src/index.ts`: 턴 전환 멘션 발송 시 `rawJson.message?.id`를 인자로 넘기도록 수정
- `src/index.test.ts`: 변경된 API 및 동작을 검증하기 위해 테스트 코드 보완
