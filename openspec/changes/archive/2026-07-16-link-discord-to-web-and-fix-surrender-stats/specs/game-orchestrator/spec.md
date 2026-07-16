## MODIFIED Requirements

### Requirement: Discord Profile Slash Command
The system SHALL handle the `/profile` slash command to display user statistics scoped to the current Discord server (guild), including the overall average score (excluding surrendered matches) and the outcome list (W/L/D) of their recent 10 multiplayer matches. At the end of the profile response, the system MUST append a hyperlink pointing directly to the player's web dashboard profile URL (e.g. `https://discord-yachoo.woowong.workers.dev/web?player={userId}`).

#### Scenario: Show Player Profile
- **WHEN** user executes `/profile` command in a specific server (guild)
- **THEN** the system SHALL fetch guild-specific stats from PlayerRepository, compute the player's average score over all matches in that guild (excluding surrendered ones), retrieve the outcomes of their recent 10 matchmaking matches, and return a summary message containing ELO, wins, losses, average score, the recent W/L/D streak, and a clickable link to the Web Dashboard.

### Requirement: Discord Leaderboard Slash Command
The system SHALL handle the `/leaderboard` slash command to display top players for the current Discord server (guild). The response embed MUST include a link directing players to the global rankings on the Web Dashboard.

#### Scenario: Show Leaderboard
- **WHEN** user executes `/leaderboard` command in a specific server (guild)
- **THEN** the system SHALL fetch top players for that `guildId` from PlayerRepository and return the serialized leaderboard embed containing a link pointing to the Web Dashboard.

### Requirement: Discord Game Interaction Handling
The system SHALL handle component interactions (hold buttons, roll buttons, category selection) to progress the game state. When the game finishes, it MUST save the match record (with the `surrenderedId` if it ended in a surrender) and update player statistics scoped to the guild where the interaction occurred. For surrender interactions, the system MUST first send an ephemeral confirmation message containing a confirmation button that embeds the `gameId` in its `custom_id` to prevent accidental surrenders and allow resolution of the game state from the ephemeral context. In addition, all completion/surrender notifications MUST include a link pointing to the web replay URL of the match.

#### Scenario: Execute Confirmed Surrender
- **WHEN** a player clicks the actual surrender confirmation button in the ephemeral message
- **THEN** the system SHALL extract the `gameId` from the custom ID, load the active game, proceed to surrender the game, transition the state to Finished, record the game end statistics, save the match record with the player's ID in `surrenderedId`, and patch the main game board message to show the finished status with a link to the Web Dashboard replay.

### Requirement: Discord History Slash Command
The system SHALL support the `/history` slash command to allow players to view recent games and detailed turn-by-turn logs for the current Discord server (guild). History listings and detailed logs MUST display surrender outcomes as `Won (KO)` or `Lost (KO)` (or `기권패`), and provide direct web replay hyperlinks.

#### Scenario: Display recent matches list
- **WHEN** a user runs the `/history` command without specifying a game ID in a specific server (guild)
- **THEN** the system MUST display an embed containing a list of the user's 5 most recent matches played in that guild, displaying surrender games with a `KO` status, along with interactive buttons to view details for each match.
