## ADDED Requirements

### Requirement: Horizontal Single-Line Dice Rendering
The Discord presentation layer SHALL render the current dice state on a single horizontal line in the embed description when roll count is greater than 0, displaying dice face emojis and appending a lock icon (`🔒`) next to any die that is currently held.

#### Scenario: Rendering current dice horizontally with held status
- **WHEN** serializing active game state with roll count > 0 (e.g. dice `[6, 3, 4, 1, 4]` and holds `01010`)
- **THEN** the embed description MUST format `Current Dice` on a single line as `:six: :three:🔒 :four: :one:🔒 :four:` instead of multiple vertical lines.

## MODIFIED Requirements

### Requirement: Consistent Dice Hold Button Labels during Rolling Animation
The Discord presentation layer SHALL render dice hold buttons and action buttons (roll, surrender) during the rolling animation (`serializeRolling`) using exact button structures, labels, and icons identical to standard turn rendering (`serializeGame`), preventing layout shifts or text length changes when buttons are disabled. Specifically, the surrender button MUST be rendered as icon-only (`emoji: { name: "🏳️" }`) without a text label in both active and rolling animation states.

#### Scenario: Rolling animation surrender button uniformity
- **WHEN** serializing game state during rolling animation disabled state
- **THEN** the surrender button MUST be disabled, style 4 (Danger), with emoji `🏳️` and NO text label, matching active turn rendering and maintaining identical button widths.
