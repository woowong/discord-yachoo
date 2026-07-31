## MODIFIED Requirements

### Requirement: Render turn-by-turn replay table
The web dashboard SHALL render a turn-by-turn replay table with columns for Turn, Player, Category, Dice, Gained Score, and Cumulative Score. The Cumulative Score column MUST show the player's cumulative score after that turn, including the upper section bonus when earned. For legacy history records without a stored cumulative score, the dashboard MUST derive the bonus-inclusive value from the available turn scores.

#### Scenario: Render turn-by-turn replay table
- **WHEN** a match replay is opened
- **THEN** the system SHALL render a table with columns for Turn, Player, Category, Dice, Gained Score, and Cumulative Score
- **AND** each row's Cumulative Score MUST include any upper section bonus earned by that player at or before the row's turn
- **THEN** the system SHALL color-highlight the score column based on points (e.g., red for 0 points, bright green/gold for high scores/Yachts) and style rows with distinct colors (Blue for Player 1, Green for Player 2)

### Requirement: Score Differential Column in Replay Modal
The web dashboard replay modal SHALL display a score differential (Δ Diff) column in the turn-by-turn replay table, rendering cell content with cumulative score differences relative to the opponent. The differential MUST be calculated from bonus-inclusive cumulative scores.

#### Scenario: Display score differential in replay table
- **WHEN** a user opens the turn replay modal for a multiplayer game match
- **THEN** each turn row MUST render a `<td>` element containing the relative score differential against the opponent (e.g. `+12점 (우세)` or `-5점 (열세)`) matching the 7-column table header
- **AND** the differential MUST reflect an upper section bonus when it has been earned by either player

### Requirement: Replay Score Advantage Delta Line Chart
The web dashboard replay modal SHALL display an interactive line chart illustrating the score differential trend between players from Round 1 through Round 12 in multiplayer matches. Each round's differential MUST use the players' bonus-inclusive cumulative scores at the end of that round.

#### Scenario: Render round-by-round score differential chart
- **WHEN** a user opens the replay modal for a multiplayer match
- **THEN** a Chart.js line chart MUST be rendered above the turn table, mapping Round 1 through Round 12 on the X-axis and relative cumulative score difference on the Y-axis against a zero-level baseline
- **AND** the chart MUST include upper section bonus points from the round in which each player earned them
- **AND WHEN** the match is a single player match
- **THEN** the score differential chart container MUST be hidden
