## ADDED Requirements

### Requirement: Persona-Based Connectome Duel with Spectator Telemetry
The system SHALL support simulating 1v1 Yacht duels between parameterized fly personas (Jackpot, Newton, Speeder, Chimera) and generating structured turn-by-turn telemetry including dopamine excitation levels (PAM/PPL1) and in-character spectator dialogues.

#### Scenario: Simulating a match with spectator timeline
- **WHEN** client requests a duel between two specified persona types
- **THEN** system executes 12 rounds on independent boards using each persona's neuromodulatory and synaptic parameters, records dopamine percentages and contextual dialogues for each round, and returns a structured match payload with round summaries, final scores, and lead changes.
