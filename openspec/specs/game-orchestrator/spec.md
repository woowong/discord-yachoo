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
The system SHALL handle the `/challenge` slash command to start a new Yacht game. The system MUST prevent a user from challenging themselves in multiplayer mode. In addition, the system MUST check if there is an active (InProgress) game already existing between the same player combination. If an active game exists, the system MUST block the new game creation and return an ephemeral message containing a direct link to the existing game message.

#### Scenario: Start Single Player Game
- **WHEN** user executes `/challenge` command without options
- **THEN** the system SHALL initialize a new single-player game, save it, and return the serialized game embed.

#### Scenario: Start Multiplayer Game
- **WHEN** user executes `/challenge` command with opponent option where the opponent is NOT the user and there is no active game between them
- **THEN** the system SHALL initialize a new multiplayer game between the user and the opponent, save it, and return the serialized game embed.

#### Scenario: Prevent Self Challenge in Multiplayer Game
- **WHEN** user executes `/challenge` command with opponent option where the opponent IS the user
- **THEN** the system MUST return an error message indicating that self-challenging is not allowed, and prevent game initialization.

#### Scenario: Block Duplicate Multiplayer Match
- **WHEN** user A executes `/challenge` command with opponent B, but there is already an active game between A and B with `status = 'InProgress'`
- **THEN** the system MUST block game creation and return an ephemeral message containing a direct link (`https://discord.com/channels/{guildId}/{channelId}/{messageId}`) to the existing game message using the stored message ID.

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

### Requirement: Active Game Round Number Display
The system SHALL display the current round number on the active game Discord embed.

#### Scenario: Rendering round number on active game embed
- **WHEN** rendering the active game state for a player
- **THEN** the system MUST calculate the current round number (from 1 to 12) and display it in the embed description

### Requirement: Discord Last Turn Action Display
The system SHALL display the previous turn's action details in the main Discord game embed when there is a record of previous turns in the current game.

#### Scenario: Rendering game board with turn history
- **WHEN** serializing the game state and the game has at least one record in `turnHistory`
- **THEN** the system MUST extract the last turn record, format the action details (including player name, chosen category, score, and final dice values with emoji representation), and append this information to the embed's description.

### Requirement: Fixed-width Dice Hold Buttons
The system SHALL keep the visual width of the dice buttons constant regardless of their held state to prevent UI layout shifting.

#### Scenario: Toggling Dice Hold State Width
- **WHEN** a player toggles a die between held and unheld states
- **THEN** the button's label MUST maintain equivalent visual character lengths (e.g., using `[1]` for unheld state and `🔒` for held state) to avoid shifting adjacent buttons on the Discord client UI.

### Requirement: Architecture Separation of Interaction Handling
The system SHALL separate Discord Webhook parsing and Signature verification from the actual game play orchestrating logic.
The play orchestration logic MUST be encapsulated in a decoupled Application Service (`GameWorkflowService`) using pure Effect.ts layers.

#### Scenario: Verify decoupled GamePlay execution
- **WHEN** a valid roll or category selection interaction is received
- **THEN** the system SHALL execute the logic through the `GameWorkflowService` without direct coupling to HTTP/Webhook request objects.

### Requirement: Refactoring Safety via Integration Test Suite
The system SHALL have a comprehensive Integration Test Suite that runs in `vitest` to verify the end-to-end webhook interactions (ping, challenge, roll, hold, select_category, surrender).
All existing scenarios MUST be fully verified by this test suite, and the tests MUST pass successfully before and after refactoring (Red-Green-Refactor).

#### Scenario: Verify Integration Test Suite execution
- **WHEN** the test suite is run on the worker entry point (`src/index.ts`)
- **THEN** it SHALL simulate Discord webhook requests and verify that all database updates, Discord API calls, and final responses match the original behavior.

