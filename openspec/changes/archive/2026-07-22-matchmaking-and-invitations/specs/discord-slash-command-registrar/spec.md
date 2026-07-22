## MODIFIED Requirements

### Requirement: Discord Command Registration
The system SHALL support remote registration of `/challenge`, `/match`, `/profile`, `/leaderboard`, and `/history` slash commands via the Discord Application Commands API.

#### Scenario: Register Global or Guild Commands
- **WHEN** the command registration script is run with valid Discord App ID, Bot Token, and optional Guild ID env vars
- **THEN** the system SHALL send a PUT request to the Discord API to register all slash commands (including `/match` for open queue matchmaking) and output success or error status.
