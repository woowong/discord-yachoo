## Why

현재 Discord Multi 모드(다인 매칭 모드)에서 턴이 전환되었을 때, 상대방 플레이어가 실시간으로 인지하지 못하는 상황이 발생하여 게임 템포가 루즈해집니다. 이 제안은 다음 플레이어의 턴이 시작되면 알림 멘션을 발송하고, 해당 플레이어가 주사위를 굴리거나 홀드 버튼을 누르는 등 액션(ACK)을 취하면 멘션 메시지를 자동 삭제하여, 턴 대기 중인 플레이어가 AFK(자리를 비운) 상태에서도 알림을 받고 바로 복귀할 수 있도록 개선하기 위함입니다.

## What Changes

- **실시간 턴 멘션 알림 발송**: 플레이어가 점수 기입을 마치고 다음 플레이어의 턴으로 전환될 때, 백그라운드에서 다음 턴 플레이어에게 멘션 메시지를 발송합니다.
- **액티브 멘션 상태 저장**: 멘션 메시지가 발송되면 해당 메시지의 ID(`lastMentionMessageId`)와 채널 ID(`lastMentionChannelId`)를 `GameState`에 기록합니다.
- **자동 멘션 삭제 (ACK 처리)**: 멘션된 플레이어가 주사위 롤링이나 홀드 등 턴 수행 액션을 취하면, 이전에 발송된 멘션 메시지를 자동으로 삭제하고 `GameState`에서 멘션 정보를 비웁니다.
- **에러 핸들링**: 사용자가 멘션 메시지를 직접 지운 상태에서 봇이 삭제를 시도할 때 발생하는 HTTP 에러(404)를 안전하게 예외 처리합니다.
- **사용자 설정 요구사항**: 디스코드 REST API를 이용해 채널에 메시지를 발송하고 삭제하기 위해 `DISCORD_BOT_TOKEN` 환경 변수(Secret)의 설정이 필수적입니다.

## Capabilities

### New Capabilities
- `turn-mention-notification`: 다음 플레이어의 턴 시작 시 멘션을 전송하고, 플레이어가 액션을 수행(ACK) 시 해당 멘션 메시지를 삭제하는 기능 전반을 정의합니다.

### Modified Capabilities
- `discord-interaction-parser`: 디스코드 Interaction 요청으로부터 메시지가 발생한 채널 ID(`channel_id`)를 추가적으로 파싱하여 가져올 수 있도록 요구사항을 수정합니다.

## Impact

- **디스코드 봇 토큰 설정 (사용자 수행 필요)**:
  - 이 기능은 웹훅 응답(Interaction Response)의 만료 시간(15분) 제한 없이 메시지를 삭제할 수 있어야 하므로, **`DISCORD_BOT_TOKEN`** 설정이 필요합니다. Cloudflare Wrangler 환경 변수(Secret)로 봇 토큰 주입이 필요합니다.
- **GameState 구조체 변경**:
  - `GameState` 인터페이스 및 저장 시 `lastMentionMessageId`와 `lastMentionChannelId` 필드가 추가됩니다. D1 `active_games` 테이블의 JSON 직렬화에 포함되어 저장됩니다.
- **Discord Interaction Parser 및 유형 수정**:
  - Interaction 페이로드 파싱 시 `channel_id`를 파싱하여 `ParsedInteraction` 구조체에 넘겨주어야 합니다.
- **외부 API 호출 의존성 추가**:
  - 디스코드 API에 메시지 작성/삭제 요청을 보내기 위한 REST 클라이언트(혹은 fetch 래퍼)와 Effect.ts 기반 서비스 레이어가 필요합니다.
