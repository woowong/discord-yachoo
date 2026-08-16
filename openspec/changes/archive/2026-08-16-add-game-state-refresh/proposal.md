## Why

When network latency, Discord interaction 3-second timeouts, or dropped background responses occur during a game session, the Discord message UI can become desynchronized from the actual game state stored in D1 (for example, showing Turn 2 when the server is already at Turn 3). Players then encounter confusing errors like "Not your turn" or stale button states with no easy way to recover the board. Introducing a manual refresh mechanism and stale interaction auto-sync allows players to immediately re-synchronize the Discord embed with the authoritative server state.

## What Changes

- **Game Board Refresh Button**: Add a dedicated refresh button (`🔄 새로고침`, custom_id: `refresh_game`) to the game action row on the active game Discord embed.
- **Idempotent State Sync Handler**: Add a handler for `refresh_game` that retrieves the latest `GameState` from `GameRepository` and updates the message in place via Discord interaction response `type: 7` (UpdateMessage).
- **Universal Player Refresh Permission**: Allow any player participating in the match (or in the channel) to click the refresh button, regardless of whose turn it currently is.
- **Stale Action Auto-Recovery**: When an action is received on a game whose state has advanced or finished, the handler can recover by returning the latest serialized game board.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `game-orchestrator`: Add requirements for handling the game board refresh component interaction (`refresh_game`) and rendering the refresh button on active game embeds.

## Impact
- **Presentation Layer**: `src/presentation/discord/adapter/serializer.ts` (action row button layout), `src/presentation/discord/router.ts` (routing `refresh_game`), `src/presentation/discord/handlers/components.ts` (handling refresh interaction).
- **No Domain Changes**: Pure domain game state and rules remain unchanged.
- **APIs**: No external Discord API changes; uses standard Discord Interaction `UpdateMessage (Type 7)`.
