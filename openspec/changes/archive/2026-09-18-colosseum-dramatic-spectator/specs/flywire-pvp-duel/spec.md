## MODIFIED Requirements

### Requirement: Persona-Based Connectome Duel with Spectator Telemetry
The system SHALL support simulating 1v1 Yacht duels between parameterized fly personas (Jackpot, Newton, Speeder, Chimera) and generating structured turn-by-turn telemetry including intermediate roll sequences (rolls 1-3 with hold masks), cumulative scoreboard state snapshots, dopamine excitation levels (PAM/PPL1), and kitschy in-character spectator dialogues.

#### Scenario: Simulating a match with spectator timeline
- **WHEN** client requests a duel between two specified persona types via `POST /api/fly/duel`
- **THEN** system executes 12 rounds on independent boards using each persona's neuromodulatory and synaptic parameters, records each roll step (dice and holds) and cumulative category scoreboard after each round, attaches kitsch degen dialogues, and returns the full telemetry payload.
