## MODIFIED Requirements

### Requirement: Discord Challenge Slash Command
The system SHALL handle the `/challenge` slash command to start a new Yacht game. The system MUST prevent a user from challenging themselves in multiplayer mode.

#### Scenario: Start Single Player Game
- **WHEN** user executes `/challenge` command without options
- **THEN** the system SHALL initialize a new single-player game, save it, and return the serialized game embed.

#### Scenario: Start Multiplayer Game
- **WHEN** user executes `/challenge` command with opponent option where the opponent is NOT the user
- **THEN** the system SHALL initialize a new multiplayer game between the user and the opponent, save it, and return the serialized game embed.

#### Scenario: Prevent Self Challenge in Multiplayer Game
- **WHEN** user executes `/challenge` command with opponent option where the opponent IS the user
- **THEN** the system MUST return an error message indicating that self-challenging is not allowed, and prevent game initialization.
