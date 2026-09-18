## MODIFIED Requirements

### Requirement: Yacht Game State Sensory Encoding
The system SHALL encode current dice rolls (5 dice), roll count (0..2), category availability, and strategic interoceptive features into external current vectors for at least 64 input Projection Neurons (PNs) (or 128 PNs in bilateral hemisphere connectomes), incorporating:
- PN [0..29]: 5 dice x 6 values (one-hot per dice slot)
- PN [30..32]: Roll count indicator
- PN [33..44]: 12 category availability with prospective point affordance
- PN [45..49]: High-level pattern detectors (max duplicate kind, Full House detector, straight length, dice sum, high dice count)
- PN 50: Upper bonus score deficit $\max(0, 63 - \text{UpperSum}) / 63$
- PN 51: Upper bonus feasibility indicator based on remaining upper categories and deficit
- PN 52: Straight near-miss potential radar (inside gap and 4-sequence run)
- PN 53: Bidirectional open straight tension
- PN 54: High dice upper preservation urgency
- PN 55: Game pace clock ($T / 12$ round progression)
- PN 56: Open Straight vs Gutshot Gap indicator (open-ended 2.0 vs gutshot 1.0 vs none 0.0)
- PN 57: Upper High-Trio Health (obtained points in Fours, Fives, Sixes normalized by 45.0)
- PN 58: Upper Pace Velocity ($(\text{UpperSum} / 63) - (\text{Round} / 12)$)
- PN 59: Sacrifice Airbag Availability (Aces or Deuces remaining for low-penalty sacrifice)
- PN 60: Choice Safety Shield (Choice category availability)
- PN 61: Dice Variance / Chaos ($Var(\text{dice}) / 3.5$ clustering metric)
- PN 62: Score Lead/Deficit (PvP margin $\tanh(\Delta / 50)$ against opponent)
- PN 63: Exploration Freedom / Greed Gauge (remaining rerolls $\times$ remaining rounds normalized)

#### Scenario: Encoding dice and turn state
- **WHEN** a turn state with current dice `[3, 3, 4, 5, 6]`, roll count 1, and 8 remaining categories is provided
- **THEN** the encoder produces an injection vector activating corresponding sensory neurons without index out-of-bounds.

#### Scenario: Encoding dice and turn state with satiety gating
- **WHEN** a turn state with current dice `[3, 3, 4, 5, 6]`, roll count 1, and 8 remaining categories is provided
- **THEN** the encoder produces an injection vector activating corresponding sensory neurons without index out-of-bounds, and sets pattern detector currents (such as Full House PN 46) to zero if the category is already filled.

#### Scenario: Encoding dice and turn state with interoceptive sensory expansion
- **WHEN** a turn state with current dice `[1, 3, 4, 5, 6]`, roll count 1, round 4, and upper sum 18 is provided to the 64-PN encoder
- **THEN** the encoder produces a 64-dimensional injection vector activating PN 0..49 pattern detectors and PN 50..63 strategic/economic/geometric sensors without index out-of-bounds.

#### Scenario: Bilateral connectome sensory projection
- **WHEN** a bilateral 128-PN connectome simulator is initialized
- **THEN** the encoder mirrors the 64 sensory currents into both left (PN 0..63) and right (PN 64..127) hemispheres with symmetric sensory stimulus.

### Requirement: Rolling Decision Decoding (Hold/Reroll Mask)
The system SHALL map output MBON firing activity during rolling phases into a 5-element boolean hold mask directly from neural firing dynamics without heuristic rule-based overrides, responding to the straight potential radar (MBON 1 Straight Drive), open vs gutshot discrimination, and upper bonus preservation drives.

#### Scenario: Decoding hold mask from spikes
- **WHEN** the SNN emits motor spikes during a rolling phase
- **THEN** the decoder returns a valid `DiceHold` tuple of 5 booleans indicating which dice to keep.

#### Scenario: Decoding hold mask from spikes without heuristic bypass
- **WHEN** the SNN emits motor spikes during a rolling phase with two pairs on the dice while Full House is already filled
- **THEN** the decoder decodes the hold mask based on MBON neural activity and available categories rather than hardcoding a two-pair full-house hold reflex.

#### Scenario: Normalizing MBON firing to dice slot holds
- **WHEN** MBON firing counts are decoded during any roll phase
- **THEN** the system produces a valid 5-element boolean hold mask reflecting the network's behavioral drive.

#### Scenario: Straight hunting hold behavior
- **WHEN** MBON 1 (Straight Drive) exhibits dominant firing activity and dice contain a 4-dice straight potential (e.g. `[1, 3, 4, 5, 6]`)
- **THEN** the decoder outputs a hold mask preserving the straight run (`[False, True, True, True, True]` or `[True, False, True, True, True]`) rather than collapsing into duplicate pairs.
