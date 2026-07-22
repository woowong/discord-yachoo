## ADDED Requirements

### Requirement: Replay Score Advantage Delta Line Chart
The web dashboard replay modal SHALL display an interactive line chart illustrating the score differential trend between players from Round 1 through Round 12 in multiplayer matches.

#### Scenario: Render round-by-round score differential chart
- **WHEN** a user opens the replay modal for a multiplayer match
- **THEN** a Chart.js line chart MUST be rendered above the turn table, mapping Round 1 through Round 12 on the X-axis and relative cumulative score difference on the Y-axis against a zero-level baseline.
- **AND WHEN** the match is a single player match
- **THEN** the score differential chart container MUST be hidden.
