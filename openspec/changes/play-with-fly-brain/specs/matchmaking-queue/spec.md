## ADDED Requirements

### Requirement: Switch Open Matchmaking Queue to Fly AI Match
The system SHALL allow the lobby host to switch an open matchmaking queue into an active match against Fly AI when no human player has joined.

#### Scenario: Host switches open queue to Fly AI match
- **WHEN** the host clicks `[🪰 초파리와 플레이]` (`queue:play_ai:<queueId>`) on their active open queue
- **THEN** system updates the queue status to `MATCHED`, initializes an active match between the host and `AI_FLY_BRAIN`, and updates the message to the active game board.

#### Scenario: Non-host attempts to switch queue to Fly AI
- **WHEN** any user other than the lobby host clicks `[🪰 초파리와 플레이]`
- **THEN** system responds with an ephemeral error message stating only the lobby host can start a match against Fly AI.
