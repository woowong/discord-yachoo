## Why

In multiplayer Yacht games, especially when played within a Discord chat room, it is difficult for players to keep track of what action the opponent performed in their previous turn (e.g., what dice they rolled, what category they selected, and how many points they scored) since the message is updated in place. Showing the last turn action on the main game message will greatly improve game readability and player engagement.

## What Changes

- Add a "Last Turn Action" section to the main game board message in both Discord and CLI interfaces.
- The section will display the opponent's (or previous player's) last action: who played, the category chosen, points scored, and the final dice configuration (along with roll count).
- Display this information dynamically based on the game's turn history (`GameState.turnHistory`).

## Capabilities

### New Capabilities

*(None)*

### Modified Capabilities

- `game-orchestrator`: Include requirement to render the previous player's last turn action (dice, category, score, player name) in the Discord main game message if there is turn history.
- `cli-game-runner`: Include requirement to display the last turn action details in the CLI console interface.

## Impact

- **UI/UX**: Discord embeds and CLI board layout will include a new section for the last turn's record.
- **Domain State**: No changes to domain structure are needed, as `GameState.turnHistory` already contains `TurnRecord` with player name, rolls, category, and score.
