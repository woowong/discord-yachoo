## MODIFIED Requirements

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

### Requirement: Discord Game Interaction Handling
The system SHALL handle component interactions (hold buttons, roll buttons, category selection) to progress the game state. When the game finishes, it MUST save the match record and update player statistics scoped to the guild where the interaction occurred. For surrender interactions, the system MUST first send an ephemeral confirmation message to prevent accidental surrenders before executing the actual surrender state transition.

#### Scenario: Ephemeral Surrender Confirmation Request
- **WHEN** a player clicks the surrender (`🏳️`) button on the active game board
- **THEN** the system SHALL return an ephemeral response containing a confirmation button ("정말 기권하시겠습니까?") without updating the game state.

#### Scenario: Execute Confirmed Surrender
- **WHEN** a player clicks the actual surrender confirmation button in the ephemeral message
- **THEN** the system SHALL proceed to surrender the game, transit the state to Finished, record the game end statistics, and patch the main game board message to show the finished status.

## ADDED Requirements

### Requirement: Fixed-width Dice Hold Buttons
The system SHALL keep the visual width of the dice buttons constant regardless of their held state to prevent UI layout shifting.

#### Scenario: Toggling Dice Hold State Width
- **WHEN** a player toggles a die between held and unheld states
- **THEN** the button's label MUST maintain equivalent visual character lengths (e.g., using `[1]` for unheld state and `🔒` for held state) to avoid shifting adjacent buttons on the Discord client UI.
