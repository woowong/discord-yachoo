## MODIFIED Requirements

### Requirement: Discord Profile Slash Command
The system SHALL handle the `/profile` slash command to display user statistics scoped to the current Discord server (guild), including the overall average score and the outcome list (W/L/D) of their recent 10 multiplayer matches.

#### Scenario: Show Player Profile
- **WHEN** user executes `/profile` command in a specific server (guild)
- **THEN** the system SHALL fetch guild-specific stats from PlayerRepository, compute the player's average score over all matches in that guild, retrieve the outcomes of their recent 10 matchmaking matches, and return a summary message containing ELO, wins, losses, average score, and the recent W/L/D streak.

### Requirement: Discord Game Interaction Handling
The system SHALL handle component interactions (hold buttons, roll buttons, category selection) to progress the game state. When the game finishes, it MUST save the match record and update player statistics scoped to the guild where the interaction occurred. For surrender interactions, the system MUST first send an ephemeral confirmation message containing a confirmation button that embeds the `gameId` in its `custom_id` to prevent accidental surrenders and allow resolution of the game state from the ephemeral context.

#### Scenario: Handle Dice Roll Interaction
- **WHEN** user clicks "Roll Dice" button for their active game
- **THEN** the system SHALL update game state with rolled dice, immediately return an intermediate rolling animation response with all components disabled, and schedule a background task to patch the original message with the final dice values and active components.

#### Scenario: Handle Dice Hold Interaction
- **WHEN** user clicks a dice hold button
- **THEN** the system SHALL toggle hold state of the corresponding die and return the updated board.

#### Scenario: Handle Category Selection Interaction
- **WHEN** user selects a scoring category from the dropdown menu and the game finishes
- **THEN** the system SHALL record the score, advance the turn to finish, save the match record with the `guildId` to MatchRepository, and update the player statistics in PlayerRepository scoped to that `guildId`.

#### Scenario: Ephemeral Surrender Confirmation Request
- **WHEN** a player clicks the surrender (`🏳️`) button on the active game board
- **THEN** the system SHALL return an ephemeral response containing a confirmation button ("정말 기권하시겠습니까?") whose `custom_id` includes the `gameId` (formatted as `confirm_surrender_${gameId}_${targetMessageId}`), without updating the game state.

#### Scenario: Execute Confirmed Surrender
- **WHEN** a player clicks the actual surrender confirmation button in the ephemeral message
- **THEN** the system SHALL extract the `gameId` from the custom ID, load the active game, proceed to surrender the game, transition the state to Finished, record the game end statistics, and patch the main game board message to show the finished status.
