# web-dashboard Specification

## Purpose
TBD - created by archiving change fix-bugs-and-profile-dashboard. Update Purpose after archive.
## Requirements
### Requirement: Serve Web Dashboard Assets
The system SHALL serve the static HTML/CSS/JS dashboard assets directly from the Cloudflare Worker when accessed via browser GET requests at `/` or `/web/` without verifying Discord signature headers. The UI assets MUST utilize a compact design system (reduced paddings, margins, and row heights), render player nickname links connected to profile cards, display a player directory list, and provide interactive tag filter controls on the Legend Matches tab.
Additionally, the player nickname links inside the replay modal SHALL switch the view to the profile tab, close the modal, and load the player's stats. The replay table MUST display a '누적 점수' column, show distinct visual background colors and nickname dots per player, and apply distinct color highlights based on score thresholds. The profile tab SHALL render a line chart using Chart.js displaying the ELO rating history of the player.
The profile match history table SHALL include a '상대' (opponent) column that displays the opponent's nickname (extracted from the match historyJson turn data) as a clickable link. Clicking the opponent link SHALL navigate to that player's profile page.

#### Scenario: Access web dashboard home
- **WHEN** a GET request is received at `/` or `/web/`
- **THEN** the system SHALL return a 200 OK Response containing the single-page application HTML page.

#### Scenario: Click player nickname link inside replay modal
- **WHEN** a player nickname link is clicked inside the turn-by-turn replay modal
- **THEN** the modal SHALL close, the active tab SHALL switch to the profile tab, the input value SHALL be set to the clicked player's ID, and the player's profile stats SHALL load.

#### Scenario: Render turn-by-turn replay table
- **WHEN** a match replay is opened
- **THEN** the system SHALL render a table with columns for Turn, Player, Category, Dice, Gained Score, and Cumulative Score.
- **THEN** the system SHALL color-highlight the score column based on points (e.g., red for 0 points, bright green/gold for high scores/Yachts) and style rows with distinct colors (Blue for Player 1, Green for Player 2).

#### Scenario: Render ELO history chart
- **WHEN** a player profile is loaded with multi-player match records containing ELO rating history
- **THEN** the system SHALL render a line chart using Chart.js visualizing the ELO progress over time.

### Requirement: Web API Endpoints
The system SHALL expose JSON API endpoints under `/web/api/profile/:playerId`, `/web/api/legend`, and `/web/api/players` to serve statistics, legend match datasets, and the registered players list from the D1 database.
If the `guildId` query parameter is not provided (or is null), the endpoints (profile, matches, and averages) SHALL query matches and calculate scores globally across all guilds instead of filtering by `guild_id IS NULL`.

#### Scenario: Fetch user profile data via API with guildId
- **WHEN** a GET request is received at `/web/api/profile/:playerId` with a non-null `guildId` query parameter
- **THEN** the system SHALL return a 200 OK Response containing player statistics and recent matches filtered by that specific `guildId`.

#### Scenario: Fetch user profile data via API without guildId
- **WHEN** a GET request is received at `/web/api/profile/:playerId` without a `guildId` query parameter (or `guildId` is null)
- **THEN** the system SHALL return a 200 OK Response containing player statistics and recent matches retrieved globally across all guilds.

### Requirement: Score Differential Column in Replay Modal
The web dashboard replay modal SHALL display a score differential (Δ Diff) column in the turn-by-turn replay table, indicating cumulative score differences relative to the opponent.

#### Scenario: Display score differential in replay table
- **WHEN** a user opens the turn replay modal for a multiplayer game match
- **THEN** each turn row MUST display the cumulative score along with the relative score differential against the opponent (e.g. `+12점 (Lead)` or `-5점 (Lag)`)

