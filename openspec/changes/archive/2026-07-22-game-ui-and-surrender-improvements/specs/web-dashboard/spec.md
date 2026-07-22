## ADDED Requirements

### Requirement: Score Differential Column in Replay Modal
The web dashboard replay modal SHALL display a score differential (Δ Diff) column in the turn-by-turn replay table, indicating cumulative score differences relative to the opponent.

#### Scenario: Display score differential in replay table
- **WHEN** a user opens the turn replay modal for a multiplayer game match
- **THEN** each turn row MUST display the cumulative score along with the relative score differential against the opponent (e.g. `+12점 (Lead)` or `-5점 (Lag)`)
