## Context

In Discord response serialization (`serializer.ts`), two UI inconsistencies exist:
1. The surrender button definition in `serializeRolling` contained `label: "기권 (Surrender)"`, whereas in `serializeGame` it contained no `label` (icon-only `🏳️`). When dice are rolled, the interaction updates the board to a rolling state, causing the button width to suddenly expand and contract.
2. The current dice display in `serializeGame` formats each die on a separate line (`Dice 1: :six:`, etc.), taking up 5 lines in the Discord embed.

## Goals / Non-Goals

**Goals:**
- Unify button definitions between normal turn (`serializeGame`) and rolling state (`serializeRolling`), ensuring button widths stay constant during state transitions.
- Format current dice into a single horizontal line (Option A: `:six: :three:🔒 :four: :one:🔒 :four:`).
- Update unit tests in `adapter.test.ts` to match the new horizontal formatting.

**Non-Goals:**
- Changing domain game logic or score calculation rules.
- Modifying web dashboard replay view.

## Decisions

### Decision 1: Surrender Button Icon-only Uniformity
Omit the `label` field for `surrenderButton` in `serializeRolling` just as in `serializeGame`.

*Rationale*: Keeping the button icon-only (`🏳️`) maintains a minimal footprint and identical button dimensions across both active turn and rolling states.

*Alternative Considered*: Adding `"기권"` label to both normal turn and rolling states. Rejected because icon-only (`🏳️`) is more compact on mobile/desktop Discord UI and matches existing design conventions.

### Decision 2: Single-Line Horizontal Dice Display (Option A)
Render current dice as space-separated emoji representations on a single line:
`**Current Dice:** ` + `state.currentDice.map((val, idx) => (DICE_EMOJIS[val] || val) + (holds[idx] === "1" ? "🔒" : "")).join(" ")`

*Rationale*: Reduces embed height from 5 lines to 1 line, improving readability on mobile devices without cluttering.

## Risks / Trade-offs

- [Risk] Existing unit test assertions checking `Dice 3: **:three:** [HELD]` in `adapter.test.ts` will fail if not updated.
  → *Mitigation*: Update unit test assertions in `adapter.test.ts` to expect the new horizontal single-line format `:three:🔒`.
