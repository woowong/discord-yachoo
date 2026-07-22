## Context

The previous 1-line format `:three:🔒` proved ambiguous when rendered in Discord because all emojis appeared in a continuous horizontal row. Option 2 introduces a 2-line layout where Line 1 lists dice faces and Line 2 lists hold status (`🔒` for held, `1️⃣`..`5️⃣` for unheld).

## Goals / Non-Goals

**Goals:**
- Format `Current Dice` in `serializeGame` across 2 lines.
- Map unheld positions to index emojis `DICE_BUTTON_EMOJIS[idx + 1]` (`1️⃣`..`5️⃣`) and held positions to `🔒`.

**Non-Goals:**
- Modifying button rows or game workflow logic.

## Decisions

### Decision: 2-Line Layout with Index Emojis for Unheld Status
Line 1: `state.currentDice.map(v => DICE_EMOJIS[v] || v).join(" ")`
Line 2: `state.currentDice.map((_, idx) => holds[idx] === "1" ? "🔒" : DICE_BUTTON_EMOJIS[idx + 1]).join(" ")`

*Rationale*: Direct visual alignment between the status line and the hold action buttons (`[1]`~`[5]`) below it.
