## ADDED Requirements

### Requirement: Match History Consistency Migration
The D1 database matches records SHALL maintain strict consistency between summary score columns (player1_score, player2_score) and the turn-by-turn historyJson total sum.

#### Scenario: One-time migration for legacy inconsistent match records
- **WHEN** a match record in the D1 matches table has mismatching summary scores relative to its turn-by-turn historyJson sum
- **THEN** the migration script MUST recalculate actual cumulative scores from historyJson and update player1_score, player2_score, and winner_id accordingly.
