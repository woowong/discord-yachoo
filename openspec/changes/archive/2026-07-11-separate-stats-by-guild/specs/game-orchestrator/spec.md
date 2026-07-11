## MODIFIED Requirements

### Requirement: Discord Profile Slash Command
The system SHALL handle the `/profile` slash command to display user statistics scoped to the current Discord server (guild).

#### Scenario: Show Player Profile
- **WHEN** user executes `/profile` command in a specific server (guild)
- **THEN** the system SHALL fetch guild-specific stats from PlayerRepository using the `guildId` and return them in a message.

### Requirement: Discord Leaderboard Slash Command
The system SHALL handle the `/leaderboard` slash command to display top players for the current Discord server (guild).

#### Scenario: Show Leaderboard
- **WHEN** user executes `/leaderboard` command in a specific server (guild)
- **THEN** the system SHALL fetch top players for that `guildId` from PlayerRepository and return the serialized leaderboard embed.

### Requirement: Discord History Slash Command
The system SHALL support the `/history` slash command to allow players to view recent games and detailed turn-by-turn logs for the current Discord server (guild).

#### Scenario: Display recent matches list
- **WHEN** a user runs the `/history` command without specifying a game ID in a specific server (guild)
- **THEN** the system MUST display an embed containing a list of the user's 5 most recent matches played in that guild, along with interactive buttons to view details for each match.

#### Scenario: Display detailed match history with paging
- **WHEN** a user clicks a button to view details for a specific match
- **THEN** the system MUST retrieve the match record and render an embed containing a detailed round-by-round breakdown of the match, split into pages (e.g. Rounds 1-6 and Rounds 7-12) with navigation buttons and a back button.

### Requirement: Discord Game Interaction Handling
The system SHALL handle component interactions (hold buttons, roll buttons, category selection) to progress the game state. When the game finishes, it MUST save the match record and update player statistics scoped to the guild where the interaction occurred.

#### Scenario: Handle Dice Roll Interaction
- **WHEN** user clicks "Roll Dice" button for their active game
- **THEN** the system SHALL update game state with rolled dice, immediately return an intermediate rolling animation response with all components disabled, and schedule a background task to patch the original message with the final dice values and active components.

#### Scenario: Handle Dice Hold Interaction
- **WHEN** user clicks a dice hold button
- **THEN** the system SHALL toggle hold state of the corresponding die and return the updated board.

#### Scenario: Handle Category Selection Interaction
- **WHEN** user selects a scoring category from the dropdown menu and the game finishes
- **THEN** the system SHALL record the score, advance the turn to finish, save the match record with the `guildId` to MatchRepository, and update the player statistics in PlayerRepository scoped to that `guildId`.
