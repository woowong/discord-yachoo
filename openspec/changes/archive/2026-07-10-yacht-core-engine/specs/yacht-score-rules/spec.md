## ADDED Requirements

### Requirement: Upper Section Score Calculation
The system SHALL calculate the score for Aces, Deuces, Treys, Fours, Fives, and Sixes by summing only the dice showing the corresponding number.

#### Scenario: Calculate Aces with three 1s
- **WHEN** the dice roll is `[1, 1, 1, 3, 5]` and category is Aces
- **THEN** the calculated score MUST be 3

#### Scenario: Calculate Sixes with two 6s
- **WHEN** the dice roll is `[6, 6, 2, 3, 4]` and category is Sixes
- **THEN** the calculated score MUST be 12

### Requirement: Choice Score Calculation
The system SHALL calculate the Choice score as the sum of all 5 dice values.

#### Scenario: Calculate Choice score
- **WHEN** the dice roll is `[2, 3, 4, 5, 6]` and category is Choice
- **THEN** the calculated score MUST be 20

### Requirement: Four of a Kind Score Calculation
The system SHALL calculate the Four of a Kind score as the sum of all 5 dice values if 4 or more dice show the same value. Otherwise, the score SHALL be 0.

#### Scenario: Four of a Kind matched
- **WHEN** the dice roll is `[3, 3, 3, 3, 5]` and category is Four of a Kind
- **THEN** the calculated score MUST be 17

#### Scenario: Four of a Kind not matched
- **WHEN** the dice roll is `[3, 3, 3, 4, 5]` and category is Four of a Kind
- **THEN** the calculated score MUST be 0

### Requirement: Full House Score Calculation
The system SHALL calculate the Full House score as the sum of all 5 dice values if there is a three-of-a-kind and a pair (e.g. `[X, X, X, Y, Y]` where `X != Y`), or if all 5 dice show the same value (Yacht). Otherwise, the score SHALL be 0.

#### Scenario: Full House matched with three-of-a-kind and a pair
- **WHEN** the dice roll is `[4, 4, 4, 2, 2]` and category is Full House
- **THEN** the calculated score MUST be 16

#### Scenario: Full House matched with a Yacht (5 of a kind)
- **WHEN** the dice roll is `[5, 5, 5, 5, 5]` and category is Full House
- **THEN** the calculated score MUST be 25

#### Scenario: Full House not matched
- **WHEN** the dice roll is `[4, 4, 4, 2, 3]` and category is Full House
- **THEN** the calculated score MUST be 0

### Requirement: Small Straight Score Calculation
The system SHALL calculate the Small Straight score as a fixed 15 points if 4 or more dice show consecutive values (1-2-3-4, 2-3-4-5, or 3-4-5-6). Otherwise, the score SHALL be 0.

#### Scenario: Small Straight matched
- **WHEN** the dice roll is `[1, 2, 3, 4, 6]` and category is Small Straight
- **THEN** the calculated score MUST be 15

#### Scenario: Small Straight matched with Large Straight
- **WHEN** the dice roll is `[2, 3, 4, 5, 6]` and category is Small Straight
- **THEN** the calculated score MUST be 15

#### Scenario: Small Straight not matched
- **WHEN** the dice roll is `[1, 2, 3, 5, 6]` and category is Small Straight
- **THEN** the calculated score MUST be 0

### Requirement: Large Straight Score Calculation
The system SHALL calculate the Large Straight score as a fixed 30 points if all 5 dice show consecutive values (1-2-3-4-5 or 2-3-4-5-6). Otherwise, the score SHALL be 0.

#### Scenario: Large Straight matched
- **WHEN** the dice roll is `[2, 3, 4, 5, 6]` and category is Large Straight
- **THEN** the calculated score MUST be 30

#### Scenario: Large Straight not matched
- **WHEN** the dice roll is `[1, 2, 3, 4, 6]` and category is Large Straight
- **THEN** the calculated score MUST be 0

### Requirement: Yacht Score Calculation
The system SHALL calculate the Yacht score as a fixed 50 points if all 5 dice show the same value. Otherwise, the score SHALL be 0.

#### Scenario: Yacht matched
- **WHEN** the dice roll is `[6, 6, 6, 6, 6]` and category is Yacht
- **THEN** the calculated score MUST be 50

#### Scenario: Yacht not matched
- **WHEN** the dice roll is `[6, 6, 6, 6, 5]` and category is Yacht
- **THEN** the calculated score MUST be 0

### Requirement: Upper Section Bonus Qualification
The system SHALL award an additional bonus score of 35 points if the sum of all Upper Section categories (Aces, Deuces, Treys, Fours, Fives, Sixes) is 63 or higher.

#### Scenario: Bonus awarded
- **WHEN** the sum of Aces, Deuces, Treys, Fours, Fives, and Sixes is 63
- **THEN** the bonus score MUST be 35

#### Scenario: Bonus not awarded
- **WHEN** the sum of Aces, Deuces, Treys, Fours, Fives, and Sixes is 62
- **THEN** the bonus score MUST be 0
