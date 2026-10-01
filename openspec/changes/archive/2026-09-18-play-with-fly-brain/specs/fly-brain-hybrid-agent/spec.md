## Purpose

로컬 머신에서 구동되는 초파리 커넥톰 SNN 추론 API를 정의하고, Cloudflare Worker 환경에서 가상 플레이어로서 초파리 AI의 턴을 비동기로 오케스트레이션한다.

## ADDED Requirements

### Requirement: Fly SNN Inference Endpoint
The system SHALL expose a REST inference endpoint `POST /api/fly/act` on the local SNN server that receives current dice state, roll count, and available categories, and returns either a dice hold mask or a category scoring decision.

#### Scenario: SNN decides dice hold during rolls 1 or 2
- **WHEN** client sends `POST /api/fly/act` with `roll_count` < 3 and dice values
- **THEN** SNN runs forward spike propagation and responds with `{ "action": "hold", "holds": [bool, bool, bool, bool, bool] }`.

#### Scenario: SNN decides scoring category on final roll or when satisfied
- **WHEN** client sends `POST /api/fly/act` where SNN chooses to score or `roll_count` reaches 3
- **THEN** SNN responds with `{ "action": "score", "category": "<valid-score-category>" }`.

### Requirement: Virtual Fly Player Identity
The system SHALL support `AI_FLY_BRAIN` as a valid 2-player match participant with persistent D1 stats and ELO rating.

#### Scenario: Game initialization with Fly AI
- **WHEN** a match against Fly AI is started
- **THEN** system initializes `GameState` with player 2 having `playerId: "AI_FLY_BRAIN"` and `playerName: "🪰 초파리 AI (FlyWire SNN)"`.

### Requirement: Automated Turn Execution via Tunnel
The system SHALL orchestrate AI turn execution in the background via Cloudflare Worker `ctx.waitUntil` by calling the configured `FLY_BRAIN_URL` and updating the Discord message via REST API.

#### Scenario: Human player finishes turn and Fly AI executes turn
- **WHEN** human player scores and the next turn belongs to `AI_FLY_BRAIN`
- **THEN** system immediately updates the Discord message to indicate the AI is thinking, triggers the SNN decision loop in background, updates the game state, edits the Discord message, and sends a mention notification to the human player for their next turn.

#### Scenario: Fly AI server is offline or unreachable
- **WHEN** the system attempts to contact `FLY_BRAIN_URL` and receives a network error or timeout
- **THEN** system updates the Discord message with a friendly notification that the local brain server is sleeping/offline and does not crash the session.
