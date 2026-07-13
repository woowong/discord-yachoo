## MODIFIED Requirements

### Requirement: Discord Response Serialization
The system SHALL serialize game states, leaderboards, and error states into Discord Message Component format (JSON) featuring rich embeds and interactive button components.

#### Scenario: Serialize Yacht Game Board State
- **WHEN** serializing a running Yacht GameState
- **THEN** the response payload MUST contain a detailed Embed representing the scoreboards and a component structure consisting of dice hold buttons and turn action buttons (roll, score selection).

#### Scenario: Serialize Yacht Game Board State in Rolling Phase
- **WHEN** serializing a Yacht GameState that is in the rolling phase (dice are rolling)
- **THEN** the response payload MUST contain an embed with a randomized GIF image selected from a predefined pool of dice roll Giphys.

#### Scenario: Serialize Leaderboard Embed
- **WHEN** serializing a leaderboard list of top players
- **THEN** the response payload MUST contain an Embed with formatted rank, name, wins, and highest score details.
