# profile-stats Specification

## Purpose
솔로 및 멀티플레이 모드별 평균 점수, 최근 10경기 승패(W/L/D) 기록, 그리고 레전드 경기 업적 뱃지(역전승, 연승, 야추 달성 등) 통계를 산출 및 제공한다.
## Requirements
### Requirement: Calculate Overall Average Score
The system SHALL calculate the overall average score for a player by scanning their matches history. Single (solo) mode and Multi (VS) mode average scores SHALL be calculated separately.

#### Scenario: Retrieve average score
- **WHEN** the system loads player statistics
- **THEN** it SHALL query all match records containing the user as player1 or player2 and return the average score for the selected mode.

### Requirement: Track Recent 10 Matches
The system SHALL retrieve the last 10 multiplayer matches for a player and format their outcomes as a list of wins, losses, or draws (W, L, D).

#### Scenario: Formulate win-loss indicator
- **WHEN** player profile is requested in Discord or Web Dashboard
- **THEN** the system SHALL load the last 10 matches and format them using color indicators or letters (W/L/D) representing the match outcomes in chronological order.

### Requirement: Identify Legend Matches
The system SHALL scan and tag matches that fulfill special "Legend" criteria:
1. **Comeback Win (막판 역전)**: Score difference of >= 25 points at round 10 or 11, with the trailing player winning the game.
2. **Hot Streak (연속 고득점)**: A player scoring >= 15 points in 5 consecutive turns.
3. **Yacht Achieved (야추 달성)**: Any match where a player successfully scores a Yacht (50 points).
4. **Epic Fail (연속 뇌절)**: A player scoring 0 points in 3 or more consecutive turns.

#### Scenario: Scan match history for Yacht legend
- **WHEN** a match completes or the legend catalog is requested
- **THEN** the system SHALL parse `history_json` to identify if a Yacht (50 points) was scored and label the match in the legend list.

