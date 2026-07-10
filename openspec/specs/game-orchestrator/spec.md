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
- **THEN** the system SHALL update game state with rolled dice and return the updated board.

#### Scenario: Handle Dice Hold Interaction
- **WHEN** user clicks a dice hold button
- **THEN** the system SHALL toggle hold state of the corresponding die and return the updated board.

#### Scenario: Handle Category Selection Interaction
- **WHEN** user selects a scoring category from the dropdown menu
- **THEN** the system SHALL record the score, advance the turn, and return the updated board.

