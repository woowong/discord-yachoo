## MODIFIED Requirements

### Requirement: MatchRepository Interface and D1 Implementation
The system SHALL define a `MatchRepository` interface using Effect's `Context.Tag` and provide a Cloudflare D1 implementation.
The repository MUST support:
* `saveMatch(match: MatchRecord)`: Saves a match record (including its `guildId` and optional `surrenderedId`) to the database.
* `getRecentMatches(playerId: string, guildId: string | null, limit: number)`: Retrieves the list of recent matches for a specific player in the given guild.
* `getMatchById(matchId: string)`: Retrieves a specific match record by its ID.
* `getGlobalRecentMatches(guildId: string | null, limit: number)`: Retrieves the global recent matches.
* `getPlayerAverageScore(playerId: string, guildId: string | null, mode: 'single' | 'multi')`: Computes the player's average score, EXCLUDING matches that were surrendered (i.e. where `surrendered_id` is populated).

#### Scenario: Saving a completed match record
- **WHEN** `saveMatch` is invoked with a match object containing the scores, winner, and `guildId`
- **THEN** a new row is successfully inserted into the `matches` table including the `guild_id`.

#### Scenario: Querying recent matches filtered by guild
- **WHEN** `getRecentMatches` is called for player 'user1' with guild 'guild1'
- **THEN** it returns only the matches involving 'user1' that were played in 'guild1'.

#### Scenario: Querying player average score excluding surrenders
- **WHEN** `getPlayerAverageScore` is called for player 'user1' with mode 'multi'
- **THEN** it calculates the average of 'user1''s scores from matches where they played, but only includes rows where `surrendered_id` is NULL or empty.
