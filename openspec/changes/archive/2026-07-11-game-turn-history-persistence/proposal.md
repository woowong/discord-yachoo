## Why

Currently, players cannot view the detailed, turn-by-turn history (dice rolls and scoring decisions) of their completed Yacht Dice games. Additionally, the active game screen does not display the current round number, making it difficult for players to keep track of their progress (e.g., knowing they are on turn 5 out of 12). Introducing these features will enhance the user experience by providing clear game progression indicators and enabling post-game review of matches.

## What Changes

- **Round Number Display**: Render the current round number (1 to 12) on both the Discord active game embed and the local CLI simulator board.
- **Detailed Turn Tracking**: Track every dice roll and category scoring decision per turn in the domain game state.
- **D1 Match History Storage**: Update the database schema to store the serialized turn-by-turn log in the `matches` table under a new `history_json` column.
- **Match History Query `/history`**: Add a new slash command `/history` to Discord. This command will list recent matches and allow players to view a detailed, paginated round-by-round breakdown of any selected match using Discord buttons.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `yacht-state-machine`: Extend `GameState` and state transitions to track `currentTurnRolls` and `turnHistory` (turn-by-turn logs).
- `persistence-repository`: Add `historyJson` to `MatchRecord`, add a database migration to add `history_json` to the `matches` table, and add a `getMatchById` query to `MatchRepository`.
- `game-orchestrator`: Add the `/history` slash command and command handler, implement button handlers for selecting a match and paging through history, and show the round number on the active game embed.
- `cli-game-runner`: Update the CLI simulator presenter to compute and display the current round number.

## Impact

- **Database**: Add `history_json TEXT` column to the `matches` table.
- **Types**: Modify `GameState` to include `turnHistory` and `currentTurnRolls`. Add `historyJson` to `MatchRecord`.
- **Domain Logic**: Update `initGame`, `rollDice`, and `selectCategory` to maintain the turn rolls and history records.
- **Discord Bot**: Register `/history` slash command, handle routing of `/history` and buttons (`viewhistory_`, `pagehistory_`), and update embed serialization.
- **CLI Simulator**: Update console output to render the current round number.
