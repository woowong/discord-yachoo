## Context

현재 디스코드 야추 봇(`discord-yachoo`)은 Cloudflare Workers 환경에서 서버리스로 구동되며, D1 데이터베이스를 사용합니다. 초파리 뇌 커넥톰 SNN 모델(`experiments/flywire-poc`)은 수만 개의 뉴런 연결망 가중치와 시냅스 전파(LIF SNN)를 시뮬레이션하는 무거운 Python 애플리케이션입니다.

Workers의 CPU 실행 시간(50ms/30s)과 메모리 한계 내에서 SNN을 직접 실행할 수 없으므로, 로컬 머신에서 실행되는 Python 추론 서버와 Cloudflare Worker 간의 하이브리드 통신 아키텍처를 채택합니다.

## Goals / Non-Goals

**Goals:**
- 별도의 디스코드 봇 계정이나 복잡한 토큰 설정 없이 기존 봇 하나로 초파리 AI와의 1:1 대전 지원.
- 대기열(`/match`) 및 초대장(`/challenge`) UI에서 대기 중 언제든 `[🪰 초파리와 플레이]` 버튼을 눌러 초파리 대전으로 즉시 전환.
- 로컬 머신(`web_server.py`)에 SNN 추론 API(`POST /api/fly/act`)를 추가하고, Cloudflare Tunnel을 통해 Worker와 안전하게 연동.
- 유저 턴 완료 후 초파리 턴 자동 실행 및 Discord 메시지(`editMessage`) 실시간 업데이트.
- D1 DB 상에서 초파리를 가상 플레이어(`AI_FLY_BRAIN`)로 기록하여 전적 및 ELO 레이팅 연동.

**Non-Goals:**
- Cloudflare Workers 내부에 Python SNN 런타임(Pyodide 등)을 무리하게 이식하는 것.
- 디스코드 개발자 포털에 제2의 봇 애플리케이션을 생성하는 것 (불필요).
- 멀티플레이어(3인 이상) 방에 초파리를 관전자로 끼워 넣는 것.

## Decisions

### 1. 하이브리드 통신: Cloudflare Tunnel + REST Inference API
- **결정**: 로컬 Python 서버(`web_server.py`)에 `POST /api/fly/act` 엔드포인트를 노출하고, `cloudflared tunnel`을 통해 HTTPS URL을 Worker의 환경 변수(`FLY_BRAIN_URL`)로 설정.
- **대안 고려**:
  - *대안 A: 로컬 봇 전용 게이트웨이 데몬 구동*: 로컬 머신에서 discord.py로 봇을 직접 띄우는 방식. 컴퓨터가 꺼지면 봇 전체가 오프라인이 되는 치명적 단점.
  - *대안 B: Cloudflare Workers 내부 실행*: 메모리/CPU 한계 및 NumPy 바이너리 구동 불가로 실현 불가능.
- **근거**: Edge의 높은 가용성(24/7 온라인 및 일반 유저 매칭 보장)과 로컬 머신의 연산 파워를 이상적으로 결합.

### 2. 가상 플레이어 모델링 (`AI_FLY_BRAIN`)
- **결정**: `playerId = "AI_FLY_BRAIN"`, `playerName = "🪰 초파리 AI (FlyWire SNN)"`로 고정된 유저 레코드를 사용.
- **근거**: 기존 `GameState`, `PlayerRepository`, `MatchRepository`, `calculateEloChange` 순수 도메인 모델을 전혀 수정하지 않고 그대로 재활용 가능.

### 3. 백그라운드 AI 턴 오케스트레이션 (`ctx.waitUntil`)
- **결정**: 사용자가 턴을 마쳐 점수를 선택하면 Discord Webhook 응답(`type: 7`)으로 "초파리 턴 진행 중" 상태를 즉각 렌더링하고, 실제 AI 연산 및 주사위 롤 루프는 `ctx.waitUntil` 내 비동기 이펙트로 처리한 뒤 `DiscordApiService.editMessage`로 결과를 반영.
- **근거**: Discord 인터랙션 3초 타임아웃 제한을 완벽하게 우회하면서, 부드러운 UX(초파리가 주사위를 굴리고 고민하는 과정) 제공.

### 4. 로컬 서버 장애 격리 및 안전 복구 (Fault Tolerance)
- **결정**: `FLY_BRAIN_URL` 호출 실패 또는 타임아웃(3초) 발생 시 세션을 크래시하지 않고, "현재 초파리 두뇌 연산 서버가 오프라인입니다" 안내와 함께 안전하게 처리.

## Risks / Trade-offs

- **[Risk] Mac 슬립 모드 또는 터널 중단 시 AI 턴 지연** → Worker에서 3초 타임아웃 설정 및 실패 시 에러 메시지 렌더링.
- **[Risk] Rate Limit on Discord Message Edit** → AI의 턴 전체(굴림+점수 선택)를 한 번 또는 최소한의 메시지 수정(최대 1~2회)으로 완료하여 Discord 채널 메시지 수정 Rate Limit 방지.
