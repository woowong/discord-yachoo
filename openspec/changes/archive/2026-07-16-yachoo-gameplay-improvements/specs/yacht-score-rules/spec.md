## ADDED Requirements

### Requirement: Yacht Celebration Messaging
The system SHALL send a high-attention celebration message to the channel when a player scores a valid Yacht (50 points). The message content MUST randomly select from the predefined South Korean online gaming community style text pool.

#### Scenario: Yacht Celebration Triggered
- **WHEN** a player registers 50 points into the Yacht category on their turn
- **THEN** the system SHALL post a randomized community-style celebration message identifying the player and the dice configuration in the channel.

### Requirement: Failed Yacht Teasing Messaging
The system SHALL detect when a player rolls a 5-of-a-kind (Yacht) but cannot score it because their Yacht category is already filled (usually with 0 points). In this case, the system MUST send a teasing/mocking message to the channel.

#### Scenario: Mocking Accidental Yacht When Blocked
- **WHEN** a player rolls a dice configuration of five identical eyes, but their Yacht scoreboard slot is already occupied, and they record their turn score in a different category
- **THEN** the system SHALL post a randomized teasing/mocking message indicating the player's failed Yacht opportunity in the channel.

### Requirement: Accompanying Teasing Messages
The system SHALL support additional teasing message triggers for specific poor gameplay events, including low score registration, consecutive zero score streaks, and finishing last in a match.

#### Scenario: Low Score Registration Tease
- **WHEN** a player finishes their turn by registering a low score (e.g., 0 or 1 point in Aces, or less than 5 points in Choice)
- **THEN** the system SHALL post a randomized teasing message regarding the low score in the channel.

#### Scenario: Streak of Zeros Tease
- **WHEN** a player registers 0 points for two or more consecutive turns
- **THEN** the system SHALL post a randomized teasing message mentioning the consecutive zero streak in the channel.

#### Scenario: Last Place Tease
- **WHEN** a match is finished and the final score board determines the player with the lowest score
- **THEN** the system SHALL post a randomized teasing message identifying the last place player in the channel.
