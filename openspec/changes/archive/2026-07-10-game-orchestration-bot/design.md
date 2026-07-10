## Context

현재 디스코드 야추 다이스 프로젝트에는 도메인 게임 엔진, D1 데이터베이스 저장소(Player/Match), 디스코드 요청/응답 변환기(Parser/Serializer/SignatureVerifier)가 개별 컴포넌트로 존재합니다. 이를 유기적으로 엮어 서버리스 환경인 Cloudflare Workers 상에서 실제 디스코드 봇으로 기동할 수 있도록 제어 흐름(Control Flow)을 조율하고 의존성을 주입해 주는 통합 진입점(Entry Point) 및 오케스트레이터가 부재한 상태입니다.

## Goals / Non-Goals

**Goals:**
* Cloudflare Workers 환경에 부합하는 `src/index.ts` 진입점 구현 (웹훅 서명 검증 및 라우터)
* 서버리스 무상태성(Stateless)을 대응하기 위해 진행 중인 게임 세션 상태(Active Game State)의 D1 데이터베이스 영속성 구현 (`D1GameRepository`)
* `/challenge`, `/profile`, `/leaderboard` 슬래시 커맨드 및 버튼/셀렉트 박스 상호작용 비즈니스 로직 연동
* 디스코드 API에 봇의 슬래시 명령어 스키마를 동기화하는 명령어 등록 스크립트(`scripts/register-commands.ts`) 작성
* Effect.ts 환경 기반으로 라이브 서비스용 의존성 레이어(`DiscordPresenterLive`, `D1RepositoryLive` 등) 구성 완료

**Non-Goals:**
* Discord Gateway API(WebSocket 상시 연결) 방식의 연동은 범위 외로 함 (HTTP Webhook 방식만 지원)
* 로컬 CLI 시뮬레이터 자체의 핵심 로직 수정 (이미 완료되어 작동 중)

## Decisions

### 1. Active Game State 저장소 구현 방식
* **결정**: D1 데이터베이스에 `active_games` 테이블을 신설하여, 각 게임 세션 상태(GameState)를 JSON 문자열로 직렬화하여 저장합니다.
* **이유**: Cloudflare KV를 추가로 구성하는 대신 기존에 주입된 D1 데이터베이스 커넥션을 재사용함으로써 설정의 복잡도를 낮추고 데이터 일관성을 지키기 위함입니다.
* **대안**: Cloudflare KV 사용. 하지만 `wrangler.toml`에 KV 바인딩이 아직 없고, D1으로만 상태 관리가 충분히 가능합니다.

### 2. 컴포넌트 상호작용 시 Game ID 추출 방식
* **결정**: 디스코드 버튼 및 셀렉트 메뉴 클릭 시 전달받는 Interaction Payload의 `message.embeds[0].footer.text`에서 `Game ID: <gameId>` 형식을 파싱하여 게임 ID를 획득합니다.
* **이유**: `serializer.ts`가 이미 `Game ID: ${state.gameId}`를 푸터에 기록하도록 구현되어 있으며, 버튼의 `custom_id` 길이에 제약이 있는 상황에서 기존 API 인터페이스를 파괴하지 않고 깔끔하게 식별자를 획득할 수 있습니다.
* **대안**: `custom_id` 뒤에 `_${gameId}`를 접미사로 붙이기. 이 방법은 serializer 및 parser의 규격과 단위 테스트를 전면 수정해야 하는 부작용이 있습니다.

### 3. 디스코드 명령어 등록 방식
* **결정**: `scripts/register-commands.ts` 스크립트를 작성하여 Discord Application Commands API에 HTTP PUT 요청을 전송합니다.
* **이유**: 외부 대형 라이브러리 의존 없이 최소한의 HTTP 클라이언트로 동작하도록 구현하여 번들 크기를 줄이고 안정성을 확보합니다.

## Risks / Trade-offs

* **[Risk]** D1 데이터베이스 트랜잭션 수 제한 및 지연 시간(Latency)
  * **[Mitigation]** 게임 진행 중 주사위를 굴리거나 점수를 기록할 때만 D1 쓰기 작업이 일어나므로 동시성 부담이 적으며, Key-Value 형태의 단건 조회를 사용해 레이턴시를 최소화합니다.
* **[Risk]** 디스코드 Interaction 웹훅 만료 시간 (3초 규칙)
  * **[Mitigation]** 모든 웹훅 처리 작업은 비동기 처리가 필요 없는 수준의 가벼운 DB 입출력과 도메인 계산이므로 3초 내에 동기식 Response를 리턴할 수 있습니다.
