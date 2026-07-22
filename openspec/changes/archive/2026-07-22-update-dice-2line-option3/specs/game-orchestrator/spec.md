## MODIFIED Requirements

### Requirement: Horizontal Single-Line Dice Rendering
The Discord presentation layer SHALL render the current dice state in a 2-line layout in the embed description when roll count is greater than 0:
- Line 1 displays space-separated dice face emojis (e.g. `:six: :three: :four: :one: :four:`).
- Line 2 displays corresponding status indicators directly under each die: held dice display lock icon (`🔒`), and unheld dice display small white square placeholder emoji (`▫️`).

#### Scenario: Rendering current dice with 2-line layout and dot placeholder status indicators
- **WHEN** serializing active game state with roll count > 0 (e.g. dice `[6, 3, 4, 1, 4]` and holds `01010`)
- **THEN** the embed description MUST format `Current Dice` across 2 lines:
  Line 1: `:six: :three: :four: :one: :four:`
  Line 2: `▫️ 🔒 ▫️ 🔒 ▫️`
