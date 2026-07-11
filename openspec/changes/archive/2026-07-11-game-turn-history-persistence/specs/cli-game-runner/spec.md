## ADDED Requirements

### Requirement: CLI Round Number Display
The system SHALL display the current round number on the CLI board presenter.

#### Scenario: Rendering round number on terminal board
- **WHEN** rendering the scoreboard during a turn in the CLI simulator
- **THEN** the system MUST display the current round number (1 to 12) on the turn status row (e.g. `(Round X/12, Roll Y/3)`)
