## ADDED Requirements

### Requirement: Switch Challenge Invitation to Fly AI Match
The system SHALL allow the challenger to switch a pending invitation into an active match against Fly AI if the challenged opponent has not yet accepted.

#### Scenario: Challenger switches pending invitation to Fly AI match
- **WHEN** the challenger clicks `[🪰 초파리와 플레이]` (`invitation:play_ai:<invitationId>`) on their pending invitation
- **THEN** system updates the invitation status to `ACCEPTED`, initializes an active match between the challenger and `AI_FLY_BRAIN`, and updates the message to the active game board.

#### Scenario: Non-challenger attempts to switch invitation to Fly AI
- **WHEN** any user other than the challenger clicks `[🪰 초파리와 플레이]`
- **THEN** system responds with an ephemeral error message stating only the challenger can start a match against Fly AI.
