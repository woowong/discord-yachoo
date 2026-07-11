## MODIFIED Requirements

### Requirement: PlayerRepository Interface and D1 Implementation
The system SHALL define a `PlayerRepository` interface using Effect's `Context.Tag` and provide a Cloudflare D1 implementation.
The repository MUST support the following operations:
* `upsertPlayer(id: string, name: string)`: Adds a new player or updates an existing player's name.
* `getPlayer(id: string, guildId?: string | null)`: Retrieves the player's stats for the given guild (returning an `Option`). If `guildId` is empty or null, it falls back to global/DM stats.
* `updateStats(id: string, guildId: string | null, mode: 'single' | 'multi', outcome: 'win' | 'loss' | 'draw', score: number)`:
  - Updates stats in `guild_player_stats` for the specified `guild_id`. If `guildId` is null/empty, it can update DM stats.
  - If `mode` is 'single': Updates `solo_play_count` by 1, and updates `solo_highest_score` if the new score exceeds the current solo highest.
  - If `mode` is 'multi': Updates `multi_wins`/`multi_losses`/`multi_draws` according to the outcome, and updates `multi_highest_score` if the new score exceeds the current multi highest.
  - For backwards compatibility, it SHALL also update the legacy `wins`, `losses`, `draws`, and `highest_score` fields in the global `players` table.
* `getLeaderboard(mode: 'single' | 'multi', guildId: string | null, limit: number)`:
  - Retrieves top players for the specified `guildId` from the `guild_player_stats` table.
  - If `mode` is 'single': Retrieves top players sorted by `solo_highest_score` descending.
  - If `mode` is 'multi': Retrieves top players sorted by `multi_wins` descending.

#### Scenario: Updating player solo stats
- **WHEN** `updateStats` is called for player 'user1' with guild 'guild1', mode 'single', outcome 'win' and score 150 (current solo highest is 120)
- **THEN** `solo_play_count` in `guild_player_stats` for 'guild1' is incremented by 1, `solo_highest_score` is updated to 150, and legacy global stats are also updated.

#### Scenario: Updating player multi stats
- **WHEN** `updateStats` is called for player 'user1' with guild 'guild1', mode 'multi', outcome 'win' and score 150 (current multi highest is 120)
- **THEN** `multi_wins` in `guild_player_stats` for 'guild1' is incremented by 1, `multi_highest_score` is updated to 150, and legacy global stats are also updated.

#### Scenario: Querying solo leaderboard
- **WHEN** `getLeaderboard` is called with mode 'single', guild 'guild1' and limit 5
- **THEN** it returns the top 5 players for 'guild1' ordered by `solo_highest_score` descending.

#### Scenario: Querying multi leaderboard
- **WHEN** `getLeaderboard` is called with mode 'multi', guild 'guild1' and limit 5
- **THEN** it returns the top 5 players for 'guild1' ordered by `multi_wins` descending.

### Requirement: MatchRepository Interface and D1 Implementation
The system SHALL define a `MatchRepository` interface using Effect's `Context.Tag` and provide a Cloudflare D1 implementation.
The repository MUST support:
* `saveMatch(match: MatchRecord)`: Saves a match record (including its `guildId`) to the database.
* `getRecentMatches(playerId: string, guildId: string | null, limit: number)`: Retrieves the list of recent matches for a specific player in the given guild.

#### Scenario: Saving a completed match record
- **WHEN** `saveMatch` is invoked with a match object containing the scores, winner, and `guildId`
- **THEN** a new row is successfully inserted into the `matches` table including the `guild_id`.

#### Scenario: Querying recent matches filtered by guild
- **WHEN** `getRecentMatches` is called for player 'user1' with guild 'guild1'
- **THEN** it returns only the matches involving 'user1' that were played in 'guild1'.
