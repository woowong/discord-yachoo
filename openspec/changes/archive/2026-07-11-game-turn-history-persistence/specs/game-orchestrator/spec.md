## ADDED Requirements

### Requirement: Discord History Slash Command
The system SHALL support the `/history` slash command to allow players to view recent games and detailed turn-by-turn logs.

#### Scenario: Display recent matches list
- **WHEN** a user runs the `/history` command without specifying a game ID
- **THEN** the system MUST display an embed containing a list of the user's 5 most recent matches, along with interactive buttons to view details for each match

#### Scenario: Display detailed match history with paging
- **WHEN** a user clicks a button to view details for a specific match
- **THEN** the system MUST retrieve the match record and render an embed containing a detailed round-by-round breakdown of the match, split into pages (e.g. Rounds 1-6 and Rounds 7-12) with navigation buttons and a back button

### Requirement: Active Game Round Number Display
The system SHALL display the current round number on the active game Discord embed.

#### Scenario: Rendering round number on active game embed
- **WHEN** rendering the active game state for a player
- **THEN** the system MUST calculate the current round number (from 1 to 12) and display it in the embed description
