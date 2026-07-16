## MODIFIED Requirements

### Requirement: Serve Web Dashboard Assets
The system SHALL serve the static HTML/CSS/JS dashboard assets directly from the Cloudflare Worker when accessed via browser GET requests at `/` or `/web/` without verifying Discord signature headers. The UI assets MUST utilize a compact design system (reduced paddings, margins, and row heights), render player nickname links connected to profile cards, display a player directory list, and provide interactive tag filter controls on the Legend Matches tab. In addition, the matches table MUST represent surrendered matches using the `KO` or `기권패` marker for clear feedback.

#### Scenario: Access web dashboard home
- **WHEN** a GET request is received at `/` or `/web/`
- **THEN** the system SHALL return a 200 OK Response containing the single-page application HTML page.
