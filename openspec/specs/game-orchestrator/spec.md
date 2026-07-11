# game-orchestrator Specification

## Purpose
TBD - created by archiving change game-orchestration-bot. Update Purpose after archive.
## Requirements
### Requirement: Discord Webhook Verification
The system MUST verify Ed25519 signature of incoming requests from Discord.

#### Scenario: Valid Signature
- **WHEN** request has valid X-Signature-Ed25519 and X-Signature-Timestamp headers matching the Discord Public Key
- **THEN** the system SHALL proceed to parse and execute the interaction.

#### Scenario: Invalid Signature
- **WHEN** request has invalid signature headers
- **THEN** the system SHALL return a 401 Unauthorized response.

### Requirement: Discord Ping-Pong
The system SHALL handle PING (Type 1) interactions by returning a PONG response.

#### Scenario: Handle PING Interaction
- **WHEN** a PING interaction is parsed
- **THEN** the system SHALL return a JSON response with type 1.

### Requirement: Discord Challenge Slash Command
The system SHALL handle the `/challenge` slash command to start a new Yacht game.

#### Scenario: Start Single Player Game
- **WHEN** user executes `/challenge` command without options
- **THEN** the system SHALL initialize a new single-player game, save it, and return the serialized game embed.

#### Scenario: Start Multiplayer Game
- **WHEN** user executes `/challenge` command with opponent option
- **THEN** the system SHALL initialize a new multiplayer game between the user and the opponent, save it, and return the serialized game embed.

### Requirement: Discord Profile Slash Command
The system SHALL handle the `/profile` slash command to display user statistics.

#### Scenario: Show Player Profile
- **WHEN** user executes `/profile` command
- **THEN** the system SHALL fetch stats from PlayerRepository and return them in a message.

### Requirement: Discord Leaderboard Slash Command
The system SHALL handle the `/leaderboard` slash command to display top players.

#### Scenario: Show Leaderboard
- **WHEN** user executes `/leaderboard` command
- **THEN** the system SHALL fetch top players from PlayerRepository and return the serialized leaderboard embed.

### Requirement: Discord Game Interaction Handling
The system SHALL handle component interactions (hold buttons, roll buttons, category selection) to progress the game state.

#### Scenario: Handle Dice Roll Interaction
- **WHEN** user clicks "Roll Dice" button for their active game
- **THEN** the system SHALL update game state with rolled dice, immediately return an intermediate rolling animation response with all components disabled, and schedule a background task to patch the original message with the final dice values and active components.

#### Scenario: Handle Dice Hold Interaction
- **WHEN** user clicks a dice hold button
- **THEN** the system SHALL toggle hold state of the corresponding die and return the updated board.

#### Scenario: Handle Category Selection Interaction
- **WHEN** user selects a scoring category from the dropdown menu
- **THEN** the system SHALL record the score, advance the turn, and return the updated board.

### Requirement: Discord History Slash Command
The system SHALL support the `/history` slash command to allow players to view recent games and detailed turn-by-turn logs.

#### Scenario: Display recent matches list
- **WHEN** a user runs the `/history` command without specifying a game ID
- **THEN** the system MUST display an embed containing a list of the user's 5 most recent matches, along with interactive buttons to view details for each match

#### Scenario: Display detailed match history with paging
- **WHEN** a user clicks a button to view details for a specific match
- **THEN** the system MUST retrieve the match record and render an embed containing a detailed round-by-round breakdown of the match, split into pages (e.g. Rounds 1-6 and Rounds 7-12) with navigation buttons and a back button

### Requirement: Active Game Round Number Display
The system SHALL display the current round number on the active game Discord embed.

#### Scenario: Rendering round number on active game embed
- **WHEN** rendering the active game state for a player
- **THEN** the system MUST calculate the current round number (from 1 to 12) and display it in the embed description


