## MODIFIED Requirements

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
