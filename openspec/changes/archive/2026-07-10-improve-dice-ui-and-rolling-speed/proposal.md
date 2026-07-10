## Why

현재 디스코드 야추 봇의 주사위 눈금 표시(`⚀` ~ `⚅`)가 모바일이나 다크 모드 환경에서 너무 작아 가독성이 매우 떨어집니다. 또한, 사용자가 "Roll Dice" 버튼을 누르거나 주사위를 고를 때마다 매번 Cloudflare D1 데이터베이스 조회/저장을 순차적으로 수행하여 응답 대기 시간(체감 지연)이 길게 발생합니다. 이 제안서는 주사위 가독성을 높이고 버튼의 시각 요소(이모지)를 풍부하게 하며, 지연된 웹훅(Deferred PATCH) 업데이트를 활용한 주사위 굴리기 애니메이션을 구현하여 체감 반응 속도와 게임 경험을 혁신하는 것을 목표로 합니다.

## What Changes

* **주사위 텍스트 시각화 개선**: 임베드 메시지 내 주사위 눈금을 기존 유니코드 문자에서 디스코드 표준 이모지인 `:one:`, `:two:`, `:three:`, `:four:`, `:five:`, `:six:`로 변경하여 큼직하게 렌더링합니다.
* **버튼 컴포넌트 이모지 추가**: 
  * "Roll Dice" 버튼에 🎲 이모지를 추가합니다.
  * 주사위 홀드 버튼에 주사위 값에 매칭되는 유니코드 이모지(`1️⃣` ~ `6️⃣`)를 `emoji` 필드를 통해 추가하여 버튼 상에 명료하게 표시합니다.
* **주사위 굴리기 애니메이션 및 백그라운드 처리**:
  * 사용자가 주사위를 굴리면, 즉시 최종 결과를 계산 및 D1에 저장합니다.
  * 클라이언트에게는 모든 조작 버튼을 비활성화하고 롤링 애니메이션 GIF와 "주사위를 굴리는 중..." 텍스트를 담은 응답을 즉시(100ms 이내) 반환합니다.
  * Cloudflare Workers의 `ctx.waitUntil`을 사용하여 1.2초 후 백그라운드에서 디스코드 Webhook PATCH API를 호출하여 최종 주사위 결과가 반영된 원래 메시지로 복구하고 버튼을 다시 활성화합니다.
* **인터랙션 파서 정보 확장**: Discord REST Webhook 호출을 위해 들어오는 Interaction 데이터에서 `application_id`와 `token`을 추가로 파싱합니다.

## Capabilities

### New Capabilities
*(없음)*

### Modified Capabilities
- `discord-interaction-parser`: 디스코드 Interaction 수신 시 `application_id`와 `token`을 함께 파싱하도록 데이터 스키마와 파싱 규칙을 수정합니다.
- `game-orchestrator`: 주사위 롤링 시 즉시 비활성화된 애니메이션 상태를 응답하고, 백그라운드 지연 실행(`ctx.waitUntil`)을 통해 최종 게임 보드로 메시지를 업데이트(Webhook PATCH)하도록 비즈니스 흐름을 변경합니다.

## Impact

* **프레젠테이션 및 직렬화 레이어 (`src/presentation/discord/adapter/*`)**:
  * `types.ts` 내 `ParsedInteraction`, `DiscordEmbed`, `DiscordButton` 등 타입 정의 수정 및 확장.
  * `parser.ts`에서 `application_id`와 `token` 파싱 로직 추가.
  * `serializer.ts`에서 주사위 이모지(DICE_EMOJIS, DICE_BUTTON_EMOJIS) 매핑 수정 및 애니메이션 상태용 직렬화 메서드(`serializeRolling`) 추가.
* **엔트리포인트 (`src/index.ts`)**:
  * Cloudflare Worker `fetch` 핸들러에서 `ctx: ExecutionContext` 파라미터 수신 및 활용.
  * `handleInteraction` 로직에서 `roll_` 요청 시 애니메이션 화면을 즉시 응답하고, `ctx.waitUntil`을 사용하여 백그라운드 비동기 PATCH 요청 전송 처리.
* **의존성**:
  * 디스코드 API 호출을 위한 외부 HTTPS PATCH 요청(`discord.com/api/v10/webhooks/...`) 추가.
