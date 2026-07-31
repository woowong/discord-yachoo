## MODIFIED Requirements

### Requirement: Discord History Slash Command
The system SHALL support the `/history` slash command to allow players to view recent games and detailed turn-by-turn logs for the current Discord server (guild). History listings and detailed logs MUST display surrender outcomes as `Won (KO)` or `Lost (KO)` (or `기권패`), provide direct web replay hyperlinks, and show both each turn's gained score and the player's cumulative score after that turn. Cumulative scores MUST include the upper section bonus when earned.

#### Scenario: Display recent matches list
- **WHEN** a user runs the `/history` command without specifying a game ID in a specific server (guild)
- **THEN** the system MUST display an embed containing a list of the user's 5 most recent matches played in that guild, displaying surrender games with a `KO` status, along with interactive buttons to view details for each match

#### Scenario: Display turn cumulative scores in match details
- **WHEN** a user opens the detailed history of a completed match
- **THEN** each displayed turn MUST include the points earned in that turn and the player's cumulative score after the turn
- **AND** the cumulative score MUST include the 35-point upper section bonus from the turn where the threshold was reached onward

#### Scenario: Display legacy match details
- **WHEN** a completed match contains history records without cumulative score fields
- **THEN** the detailed history view MUST derive and display cumulative scores using the recorded scores and upper section bonus rule
