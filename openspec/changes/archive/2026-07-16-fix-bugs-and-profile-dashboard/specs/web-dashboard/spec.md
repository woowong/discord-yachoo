## ADDED Requirements

### Requirement: Serve Web Dashboard Assets
The system SHALL serve the static HTML/CSS/JS dashboard assets directly from the Cloudflare Worker when accessed via browser GET requests at `/` or `/web/` without verifying Discord signature headers.

#### Scenario: Access web dashboard home
- **WHEN** a GET request is received at `/` or `/web/`
- **THEN** the system SHALL return a 200 OK Response containing the single-page application HTML page.

### Requirement: Web API Endpoints
The system SHALL expose JSON API endpoints under `/web/api/profile/:playerId` and `/web/api/legend` to serve statistics and legend match datasets from the D1 database.

#### Scenario: Fetch user profile data via API
- **WHEN** a GET request is received at `/web/api/profile/:playerId` with a optional `guildId` query parameter
- **THEN** the system SHALL return a 200 OK Response containing player statistics (ELO, wins, losses, average score, and recent match details) in JSON format.
