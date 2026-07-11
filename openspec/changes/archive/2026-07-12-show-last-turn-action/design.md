## Context

In the current multiplayer game implementation, when a player completes their turn, the Discord message is updated. However, the next player often finds it hard to notice what exactly the opponent did (e.g. which dice they rolled, what category they selected, and how many points they scored) since the Discord embed updates in-place. The game state already preserves this information in `GameState.turnHistory: readonly TurnRecord[]`. We will leverage this domain state to display the last turn action in both the Discord and CLI Presentation layers.

## Goals / Non-Goals

**Goals:**
- Extract the last `TurnRecord` from `GameState.turnHistory` when it is not empty.
- Render the last action details (player name, chosen category, score, and final dice configuration) in the Discord main game embed description.
- Render the last action details in the CLI console board.
- Align with the existing UI styling (emojis for Discord, Unicode/ASCII characters for CLI).

**Non-Goals:**
- Modify domain logic, states, or rules (`src/domain/*`).
- Modify the database schema or repositories (`src/persistence/*`).
- Support displaying details for turns prior to the immediately preceding one.

## Decisions

### 1. Discord Embed Representation
We will append the last turn details directly to the `description` of the embed returned by `serializeGame` in `src/presentation/discord/adapter/serializer.ts`.

- **Condition**: `state.turnHistory.length > 0`
- **Output format**:
  ```markdown
  💬 **Last Turn Action:**
  **<PlayerName>** scored **<Score> pts** in **<Category>**
  Dice: :one: :two: :three: :four: :five: (Rolled <RollCount> times)
  ```
- **Category Label Mapping**: We will use the existing `CATEGORIES` array to retrieve the user-friendly label (e.g., `FourOfAKind` -> `4 of a Kind`).

### 2. CLI Console Representation
We will render the last turn action inside the console board in `src/presentation/console/presenter.ts` above the bottom border.

- **Condition**: `state.turnHistory.length > 0` and `state.status !== "Finished"` (we already print game over results for Finished status)
- **Output format**:
  ```
  │  [Last Action] PlayerA scored 15 pts in Choice             │
  │               Dice: ⚀ ⚁ ⚂ ⚃ ⚄ (Rolled 3 times)             │
  ├────────────────────────────────────────────────────────┤
  ```

## Risks / Trade-offs

- **[Risk] Length limit of Discord Embed**: Discord has a limit of 4096 characters for an embed description.
  - *Mitigation*: The scoreboard and round information combined are currently under 1000 characters. Appending a short 3-line description for the last turn action will not exceed the limit.
- **[Risk] Displaying self actions in Single Player mode**: In single player mode, displaying the last action shows the player's own previous turn action.
  - *Decision*: This is actually helpful context even in single player mode to review what they scored last. We will enable this for both `single` and `multi` modes if history exists.
