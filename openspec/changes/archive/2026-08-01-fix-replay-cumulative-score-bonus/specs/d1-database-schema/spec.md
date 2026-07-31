## MODIFIED Requirements

### Requirement: Match History Consistency Migration
The D1 database matches records SHALL maintain strict consistency between summary score columns (`player1_score`, `player2_score`) and the final bonus-inclusive cumulative score represented by each player's turn-by-turn history JSON. A raw sum of turn scores MUST NOT be treated as the final score when the upper section bonus has been earned.

#### Scenario: One-time migration for legacy inconsistent match records
- **WHEN** a match record in the D1 matches table has mismatching summary scores relative to the final bonus-inclusive cumulative score derived from its turn-by-turn historyJson
- **THEN** the migration script MUST recalculate the actual cumulative scores from historyJson, including a 35-point upper section bonus when applicable, and update `player1_score`, `player2_score`, and `winner_id` accordingly

#### Scenario: Preserve a valid upper bonus in match repair
- **WHEN** a match's raw turn score sum is 35 points lower than its summary score and the player's upper section history reaches 63 or higher
- **THEN** the repair process MUST treat the summary score as bonus-inclusive and MUST NOT lower it to the raw turn score sum

#### Scenario: Repair legacy history without cumulative fields
- **WHEN** a match history JSON has no cumulative score fields
- **THEN** the repair process MUST derive each player's final cumulative score from category scores and the upper section bonus rule before comparing it with the summary columns
