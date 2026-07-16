## MODIFIED Requirements

### Requirement: Isolation of Message Resources
The system SHALL isolate all Korean gameplay message templates (teasing pools, celebration pools, match result messages) and localization logic from the main application entry point. All inline mentions inside these templates (teasing/celebrations) MUST receive and render the player's numerical Discord User ID rather than their username or nickname to ensure they render as active Discord user tags.

#### Scenario: Load message resources from message bundle
- **WHEN** a gameplay notification (e.g. Yacht celebration, zero-streak tease) is triggered
- **THEN** the system SHALL load the localized Korean text patterns from a dedicated message bundle or presenter without inline string templates in `index.ts`, passing the player's numerical Discord User ID to resolve mentions.
