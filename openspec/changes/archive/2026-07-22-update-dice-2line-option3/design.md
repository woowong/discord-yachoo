## Context

Using number emojis for both dice faces and position status caused double-number confusion in Discord. Replacing unheld position numbers with `▫️` (`:white_small_square:`) provides a clean visual dot placeholder under unheld dice while letting `🔒` stand out clearly for held dice.

## Goals / Non-Goals

**Goals:**
- Format `Current Dice` across 2 lines in `serializeGame`.
- Line 1: `state.currentDice.map(v => DICE_EMOJIS[v] || v).join(" ")`
- Line 2: `state.currentDice.map((_, idx) => holds[idx] === "1" ? "🔒" : "▫️").join(" ")`

**Non-Goals:**
- Modifying button actions or game domain logic.

## Decisions

### Decision: Option 3 (Dot placeholder `▫️` for unheld status)
Line 1: Dice face emojis.
Line 2: `🔒` if held, `▫️` if unheld.
