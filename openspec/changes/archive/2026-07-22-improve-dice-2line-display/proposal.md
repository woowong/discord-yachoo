## Why

The single-line horizontal dice display with attached lock icons (`:three:🔒`) created visual ambiguity because Discord emoji boxes placed adjacent to lock icons appeared as unaligned consecutive boxes (`[6] [3] 🔒 [4] [1] 🔒 [4]`), making it difficult to match dice with their hold status.

## What Changes

- **2-Line Dice & Status Display (Option 2)**:
  - Line 1: Dice face emojis separated by spaces (e.g. `:six: :three: :four: :one: :four:`).
  - Line 2: Corresponding hold status indicators directly below each die. Held dice display `🔒`, while unheld dice display their position index button emojis (`1️⃣`, `2️⃣`, `3️⃣`, `4️⃣`, `5️⃣`), clearly pairing each die with its corresponding hold button.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `game-orchestrator`: Update dice rendering format requirement to the 2-line layout with index button emojis and lock icons.

## Impact

- `src/presentation/discord/adapter/serializer.ts`: Update `serializeGame` `Current Dice` formatting.
- `src/presentation/discord/adapter/adapter.test.ts` & `src/index.test.ts`: Update unit test assertions.
