## MODIFIED Requirements

### Requirement: Yacht Game State Sensory Encoding
The system SHALL encode current dice rolls (5 dice), roll count (0..2), and category availability into external current vectors for input Projection Neurons (PNs), silencing category-specific pattern detectors when their corresponding category is no longer available.

#### Scenario: Encoding dice and turn state
- **WHEN** a turn state with current dice `[3, 3, 4, 5, 6]`, roll count 1, and 8 remaining categories is provided
- **THEN** the encoder produces an injection vector activating corresponding sensory neurons without index out-of-bounds.

#### Scenario: Encoding dice and turn state with satiety gating
- **WHEN** a turn state with current dice `[3, 3, 4, 5, 6]`, roll count 1, and 8 remaining categories is provided
- **THEN** the encoder produces an injection vector activating corresponding sensory neurons without index out-of-bounds, and sets pattern detector currents (such as Full House PN 46) to zero if the category is already filled.

### Requirement: Rolling Decision Decoding (Hold/Reroll Mask)
The system SHALL map output MBON firing activity during rolling phases into a 5-element boolean hold mask directly from neural firing dynamics without heuristic rule-based overrides.

#### Scenario: Decoding hold mask from spikes
- **WHEN** the SNN emits motor spikes during a rolling phase
- **THEN** the decoder returns a valid `DiceHold` tuple of 5 booleans indicating which dice to keep.

#### Scenario: Decoding hold mask from spikes without heuristic bypass
- **WHEN** the SNN emits motor spikes during a rolling phase with two pairs on the dice while Full House is already filled
- **THEN** the decoder decodes the hold mask based on MBON neural activity and available categories rather than hardcoding a two-pair full-house hold reflex.

#### Scenario: Normalizing MBON firing to dice slot holds
- **WHEN** MBON firing counts are decoded during any roll phase
- **THEN** the system produces a valid 5-element boolean hold mask reflecting the network's behavioral drive.
