## Context

디스코드에서 제공하는 Interaction Webhook 방식은 HTTP POST 요청을 받아 동기적으로 응답(Response)을 보내는 방식으로, API 토큰 없이 `interaction.token`을 이용해 original 메시지 수정 및 후속 메시지 작성이 가능합니다. 그러나 이 토큰은 **15분**만 유효하기 때문에 사용자가 장시간 응답하지 않는 턴제 게임 환경에서는 멘션 메시지를 안전하게 생성하고 삭제하는 기능을 안정적으로 운영하기 어렵습니다. 

따라서 봇의 영구적인 권한을 갖는 `DISCORD_BOT_TOKEN` 환경 변수를 추가하여, 봇이 API를 직접 호출해 메시지를 생성하고 삭제하는 아키텍처를 도입해야 합니다.

## Goals / Non-Goals

**Goals:**
- **턴 자동 멘션 알림**: 멀티플레이 시 플레이어가 턴을 마칠 때 다음 플레이어에게 멘션 메시지를 생성해 푸시 알림을 제공합니다.
- **자동 멘션 삭제**: 멘션된 플레이어가 액션(주사위 굴리기, 홀드 선택 등)을 수행하면 해당 멘션을 안전하게 지우고 채팅창을 깔끔하게 유지합니다.
- **비차단 백그라운드 처리**: 디스코드 API 호출(메시지 전송, 삭제)은 게임 상태 갱신 응답(HTTP Response)을 방해하지 않도록 Cloudflare Workers의 `ctx.waitUntil`을 활용해 백그라운드로 실행합니다.
- **D1 스키마 변경 최소화**: 별도의 D1 데이터베이스 마이그레이션 없이 `GameState` 직렬화 메커니즘을 이용해 상태 정보를 저장합니다.

**Non-Goals:**
- 단판(싱글플레이) 모드에서의 멘션 알림 발송.
- 멘션 외에 디스코드 채널로 턴 제한 시간(Timer) 만료 알림 등을 보내는 스케줄링 태스크 (이 제안은 실시간 턴 교대 멘션 알림에만 집중합니다).

## Decisions

### 1. Discord API 호출 방식
- **결정**: `DISCORD_BOT_TOKEN`을 Authorization 헤더로 사용하는 Discord REST API (`https://discord.com/api/v10`)를 사용합니다.
- **이유**: Interaction Token은 15분 만료 제약이 있어, 플레이어가 15분 이상 자리를 비우면 멘션 메시지를 삭제할 방법이 없습니다. 봇 토큰을 이용한 정식 REST API 호출은 시간 제약이 없어 턴제 보드게임 알림 라이프사이클에 필수적입니다.
- **대안**: Webhook Followup API를 사용해 interaction token으로 처리하는 방안이 있으나, 만료 지연 시 삭제 불가 버그로 채팅창이 어지러워지는 위험이 큽니다.

### 2. State 저장 스키마
- **결정**: `GameState` 인터페이스에 `lastMentionMessageId?: string` 및 `lastMentionChannelId?: string` 속성을 추가하고, 기존 D1 저장 메커니즘(`active_games` 테이블의 `state` JSON 컬럼)을 통해 데이터베이스 마이그레이션 없이 보관합니다.
- **이유**: `active_games`는 JSON 직렬화 방식으로 상태를 관리하고 있어 스키마 확장이 자유로우며, D1 마이그레이션 스크립트를 작성하고 릴리즈하는 절차를 생략할 수 있습니다.

### 3. 디스코드 API 연동 서비스 정의 (Effect.ts)
- **결정**: `DiscordApiService` 컨텍스트 태그와 라이브 레이어를 추가하고, Effect 기반으로 HTTP 호출을 추상화합니다.
  ```typescript
  export interface DiscordApiService {
    readonly sendMention: (channelId: string, userId: string) => Effect.Effect<string, Error>;
    readonly deleteMessage: (channelId: string, messageId: string) => Effect.Effect<void, Error>;
  }
  ```
- **이유**: Effect.ts의 레이어 기반 DI 패턴을 준수하여 로컬 시뮬레이터(ConsoleView) 등에서는 가상 Mock 서비스를 제공하고, 실제 디스코드 환경에서만 API를 쏘는 레이어를 주입하여 테스트 안정성을 확보하기 위함입니다.

## Risks / Trade-offs

- **[Risk]** 사용자가 이미 직접 멘션 메시지를 삭제한 뒤 봇이 API로 삭제하려고 시도할 때 `404 Not Found` 혹은 `403 Forbidden` 등의 REST API 에러 발생 가능.
  - **Mitigation**: `deleteMessage` 서비스의 Effect 파이프라인에서 HTTP 응답 코드가 404인 경우 이를 에러가 아닌 성공(`Effect.void`)으로 패치(catch)하여 게임 메인 로직에 지장을 주지 않도록 안전 조치합니다.
- **[Risk]** Cloudflare Worker가 봇 토큰 없이 가동될 경우 멘션 기능 오류 발생.
  - **Mitigation**: 봇 토큰 주입 여부를 런타임에 확인하여 주입되지 않았다면 멘션 알림 동작을 로그만 남기고 조용히 건너뛰도록 처리(graceful degradation)합니다.
