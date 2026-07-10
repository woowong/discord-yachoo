## ADDED Requirements

### Requirement: PlayerRepository Interface and D1 Implementation
The system SHALL define a `PlayerRepository` interface using Effect's `Context.Tag` and provide a Cloudflare D1 implementation.
The repository MUST support the following operations:
* `upsertPlayer(id: string, name: string)`: Adds a new player or updates an existing player's name.
* `getPlayer(id: string)`: Retrieves the player's stats, returning an `Option`.
* `updateStats(id: string, outcome: 'win' | 'loss' | 'draw', score: number)`: Updates wins/losses/draws, and updates `highest_score` if the new score exceeds the current highest.
* `getLeaderboard(limit: number)`: Retrieves top players sorted by `highest_score` descending.

#### Scenario: Updating player stats with a new highest score
- **WHEN** `updateStats` is called for player 'user1' with outcome 'win' and score 150 (current highest is 120)
- **THEN** wins is incremented to 1, and highest_score is updated to 150.

#### Scenario: Updating player stats without exceeding highest score
- **WHEN** `updateStats` is called for player 'user1' with outcome 'loss' and score 90 (current highest is 150)
- **THEN** losses is incremented to 1, and highest_score remains 150.

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
