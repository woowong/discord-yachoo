## Why

초파리 뇌 커넥톰 SNN 모델(`experiments/flywire-poc`)은 수만 개의 뉴런과 시냅스 전파 연산(LIF 모델, NumPy 연산)을 필요로 하므로 Cloudflare Workers의 CPU 및 메모리 제한 내에서 직접 구동할 수 없습니다. 동시에 사용자가 디스코드에서 야추 대기열(`/match`)이나 1:1 초대(`/challenge`)를 생성했을 때, 사람 상대가 없거나 응답이 늦어지면 지루하게 대기해야 하는 문제가 있습니다.

로컬 머신의 Python SNN 추론 서버를 Cloudflare Tunnel로 안전하게 Worker와 연결하고, 매칭 대기열/초대장 화면에 `[🪰 초파리와 플레이]` 버튼을 추가함으로써 별도의 봇 추가 없이도 실시간 초파리 AI 대전을 즉시 즐길 수 있도록 합니다.

## What Changes

- **로컬 Python SNN 서빙 API 확장**: `experiments/flywire-poc/src/web_server.py`에 주사위 눈, 굴림 횟수, 잔여 족보를 입력받아 SNN 추론 후 행동(`hold` 또는 `score`)을 반환하는 `POST /api/fly/act` 엔드포인트 추가.
- **매치 대기열 및 1:1 초대 UI 버튼 추가**:
  - `serializeMatchQueue`에 `[🪰 초파리와 플레이]` 버튼(`queue:play_ai:<queueId>`) 추가.
  - `serializeInvitation`에 `[🪰 초파리와 플레이]` 버튼(`invitation:play_ai:<invitationId>`) 추가.
  - 방장/신청자만 해당 버튼을 눌러 초파리 1:1 대전으로 즉시 전환할 수 있도록 권한 검증.
- **Cloudflare Worker 내 하이브리드 AI 턴 오케스트레이션**:
  - 초파리를 가상 플레이어(`playerId: "AI_FLY_BRAIN"`, `playerName: "🪰 초파리 AI"`)로 등록하여 일반 1:1 멀티플레이어 세션과 동일하게 D1 저장 및 ELO 레이팅 집계.
  - 유저 턴 종료 후 다음 턴이 `AI_FLY_BRAIN`인 경우, `ctx.waitUntil` 백그라운드 태스크에서 Cloudflare Tunnel 엔드포인트(`FLY_BRAIN_URL`)를 호출하여 초파리의 결정을 받고 주사위 굴림/족보 선택을 자동으로 수행한 뒤 Discord 메시지를 갱신.
  - 로컬 서버 오프라인(터널 미연결) 시 친절한 안내 메시지 표시 및 안전한 오류 핸들링.

## Capabilities

### New Capabilities
- `fly-brain-hybrid-agent`: 로컬 Python SNN 추론 엔드포인트(`POST /api/fly/act`) 및 Cloudflare Worker 내 AI 턴 오케스트레이션 클라이언트 명세.

### Modified Capabilities
- `game-invitation`: 초대 생성자(도전자)가 상대방 수락 대기 중 `[🪰 초파리와 플레이]` 버튼을 눌러 즉시 초파리 AI와의 1:1 게임으로 전환할 수 있는 요구사항 추가.
- `matchmaking-queue`: 대기열 생성자(방장)가 대기 중 `[🪰 초파리와 플레이]` 버튼을 눌러 즉시 초파리 AI와의 1:1 게임으로 전환할 수 있는 요구사항 추가.

## Impact

- **Affected Code**:
  - `experiments/flywire-poc/src/web_server.py`: `/api/fly/act` 핸들러 추가 및 단위 테스트 추가.
  - `src/presentation/discord/adapter/serializer.ts`: 대기열 및 초대장 액션 로우에 초파리 대전 버튼 추가.
  - `src/presentation/discord/handlers/components.ts`: `queue:play_ai:*`, `invitation:play_ai:*` 컴포넌트 인터랙션 핸들러 추가.
  - `src/application/GameWorkflowService.ts`: AI 대전 전환 메서드 및 `ctx.waitUntil` 기반 AI 턴 자동 실행 루프 구현.
  - `src/domain/types.ts` & `src/presentation/messages/ko.ts`: AI 플레이어 식별자 및 안내 메시지 상수 추가.
- **APIs & Dependencies**:
  - Worker 환경 변수 `FLY_BRAIN_URL` (Cloudflare Tunnel 엔드포인트 주소).
  - 외부 디스코드 봇 추가 불필요 (기존 `discord-yachoo` 봇 1개로 전체 처리).
