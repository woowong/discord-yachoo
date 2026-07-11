# persistence-repository Specification

## Purpose
Effect.ts 환경에서 특정 데이터베이스 드라이버나 모듈에 강결합되지 않도록 플레이어 전적 및 매치 이력 조작을 위한 Repository 패턴을 구현하고, Cloudflare D1 바인딩을 안정적으로 주입받아 작동하도록 보장합니다.
## Requirements
### Requirement: PlayerRepository Interface and D1 Implementation
The system SHALL define a `PlayerRepository` interface using Effect's `Context.Tag` and provide a Cloudflare D1 implementation.
The repository MUST support the following operations:
* `upsertPlayer(id: string, name: string)`: Adds a new player or updates an existing player's name.
* `getPlayer(id: string)`: Retrieves the player's stats (including both solo and multiplayer stats), returning an `Option`.
* `updateStats(id: string, mode: 'single' | 'multi', outcome: 'win' | 'loss' | 'draw', score: number)`:
  - If `mode` is 'single': Updates `solo_play_count` by 1, and updates `solo_highest_score` if the new score exceeds the current solo highest.
  - If `mode` is 'multi': Updates `multi_wins`/`multi_losses`/`multi_draws` according to the outcome, and updates `multi_highest_score` if the new score exceeds the current multi highest.
  - For backwards compatibility, it SHALL also update the legacy `wins`, `losses`, `draws`, and `highest_score` fields.
* `getLeaderboard(mode: 'single' | 'multi', limit: number)`:
  - If `mode` is 'single': Retrieves top players sorted by `solo_highest_score` descending.
  - If `mode` is 'multi': Retrieves top players sorted by `multi_wins` descending.

#### Scenario: Updating player solo stats
- **WHEN** `updateStats` is called for player 'user1' with mode 'single', outcome 'win' and score 150 (current solo highest is 120)
- **THEN** `solo_play_count` is incremented by 1, `solo_highest_score` is updated to 150, and legacy stats are also updated.

#### Scenario: Updating player multi stats
- **WHEN** `updateStats` is called for player 'user1' with mode 'multi', outcome 'win' and score 150 (current multi highest is 120)
- **THEN** `multi_wins` is incremented by 1, `multi_highest_score` is updated to 150, and legacy stats are also updated.

#### Scenario: Querying solo leaderboard
- **WHEN** `getLeaderboard` is called with mode 'single' and limit 5
- **THEN** it returns the top 5 players ordered by `solo_highest_score` descending.

#### Scenario: Querying multi leaderboard
- **WHEN** `getLeaderboard` is called with mode 'multi' and limit 5
- **THEN** it returns the top 5 players ordered by `multi_wins` descending.

### Requirement: MatchRepository Interface and D1 Implementation
The system SHALL define a `MatchRepository` interface using Effect's `Context.Tag` and provide a Cloudflare D1 implementation.
The repository MUST support:
* `saveMatch(match: MatchRecord)`: Saves a match record to the database.
* `getRecentMatches(playerId: string, limit: number)`: Retrieves the list of recent matches for a specific player.

#### Scenario: Saving a completed match record
- **WHEN** `saveMatch` is invoked with a match object containing the scores and winner
- **THEN** a new row is successfully inserted into the `matches` table.

### Requirement: D1Database Dependency Injection
The repository implementations MUST receive the `D1Database` binding dynamically from the Effect environment (via Context Tag) instead of depending on a global variable.

#### Scenario: Database connection injection
- **WHEN** a repository method is executed in an Effect pipeline
- **THEN** it resolves the `D1Database` service from the provided Layer to execute queries.

### Requirement: Match History JSON Storage
The system SHALL support storing the serialized turn-by-turn history of a match in the database. When a match ends, the complete game turn history list MUST be serialized into JSON format and saved in a dedicated `history_json` column of the `matches` table.

#### Scenario: Saving match with history JSON
- **WHEN** `saveMatch` is called with a match record containing history JSON content
- **THEN** the system MUST insert the match record including the `history_json` field into the database

### Requirement: Get Match by ID
The MatchRepository SHALL support retrieving a specific match record by its unique identifier (`matchId`).

#### Scenario: Successfully retrieve match by ID
- **WHEN** `getMatchById` is called with an existing `matchId`
- **THEN** the system MUST return the MatchRecord containing its scores, winner, and `historyJson`

