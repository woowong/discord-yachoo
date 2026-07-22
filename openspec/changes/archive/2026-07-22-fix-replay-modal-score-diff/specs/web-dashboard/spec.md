## MODIFIED Requirements

### Requirement: Score Differential Column in Replay Modal
The web dashboard replay modal SHALL display a score differential (Δ Diff) column in the turn-by-turn replay table, rendering cell content with cumulative score differences relative to the opponent.

#### Scenario: Display score differential in replay table
- **WHEN** a user opens the turn replay modal for a multiplayer game match
- **THEN** each turn row MUST render a `<td>` element containing the relative score differential against the opponent (e.g. `+12점 (우세)` or `-5점 (열세)`) matching the 7-column table header.
