## MODIFIED Requirements

### Requirement: Discord Game Interaction Handling
The system SHALL handle component interactions (hold buttons, roll buttons, category selection) to progress the game state.

#### Scenario: Handle Dice Roll Interaction
- **WHEN** user clicks "Roll Dice" button for their active game
- **THEN** the system SHALL update game state with rolled dice, immediately return an intermediate rolling animation response with all components disabled, and schedule a background task to patch the original message with the final dice values and active components.

#### Scenario: Handle Dice Hold Interaction
- **WHEN** user clicks a dice hold button
- **THEN** the system SHALL toggle hold state of the corresponding die and return the updated board.

#### Scenario: Handle Category Selection Interaction
- **WHEN** user selects a scoring category from the dropdown menu
- **THEN** the system SHALL record the score, advance the turn, and return the updated board.
