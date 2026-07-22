## MODIFIED Requirements

### Requirement: Discord Challenge Slash Command
The system SHALL handle the `/challenge` slash command to start a new Yacht game. Single-player games SHALL start immediately. Multiplayer games with a specified opponent SHALL create a pending 5-minute invitation with Accept/Decline options. The system MUST prevent a user from challenging themselves in multiplayer mode. In addition, the system MUST check if there is an active (InProgress) game or pending invitation already existing between the same player combination. If an active game or pending invitation exists, the system MUST block the new challenge creation and return an ephemeral error message.

#### Scenario: Start Single Player Game
- **WHEN** user executes `/challenge` command without options
- **THEN** the system SHALL initialize a new single-player game, save it, and return the serialized game embed.

#### Scenario: Create Multiplayer Game Invitation
- **WHEN** user executes `/challenge` command with opponent option where the opponent is NOT the user and there is no active game or pending invitation between them
- **THEN** the system SHALL create a pending 5-minute invitation, save it, and return the serialized invitation card embed with `[Accept]` and `[Decline]` buttons.

#### Scenario: Prevent Self Challenge in Multiplayer Game
- **WHEN** user executes `/challenge` command with opponent option where the opponent IS the user
- **THEN** the system MUST return an error message indicating that self-challenging is not allowed, and prevent game/invitation initialization.

#### Scenario: Block Duplicate Multiplayer Match or Pending Invitation
- **WHEN** user A executes `/challenge` command with opponent B, but there is already an active game or pending invitation between A and B
- **THEN** the system MUST block creation and return an ephemeral message indicating an active game or pending invitation already exists.
