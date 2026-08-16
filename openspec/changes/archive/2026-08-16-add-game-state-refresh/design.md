## Context

See `proposal.md` for motivation.
Currently, `DiscordResponseSerializerLive.serializeGame` renders components into up to 3 action rows:
- Row 1: 5 dice hold/toggle buttons (`hold_0_...` to `hold_4_...`)
- Row 2: Roll button (`roll_...`) and Surrender button (`surrender`)
- Row 3: Category selection select menu (`select_category`)

The Discord component interaction router in `src/presentation/discord/router.ts` extracts `gameId` from the embed footer (`Game ID: <id>`) and delegates component actions to specific handlers in `src/presentation/discord/handlers/components.ts`.

## Goals / Non-Goals

**Goals:**
- Add a refresh button (`[ 🔄 새로고침 ]`, custom_id: `refresh_game`) to Row 2 of active game embeds.
- Implement `handleRefresh` in `components.ts` to fetch the authoritative `GameState` from `GameRepository` and immediately respond with `type: 7` (UpdateMessage).
- Allow any player in the game or channel to click refresh to pull the latest board state without "Not your turn" restriction.
- Unit test the serializer and component handler for the refresh interaction.

**Non-Goals:**
- Real-time WebSocket or push syncing (Discord message interactions remain HTTP webhook-driven).
- Changing core domain rules or persistence schema.

## Decisions

### 1. Button placement in Action Row 2
- **Choice**: Place `[ 🔄 새로고침 ]` (style: Secondary/Gray, custom_id: `refresh_game`) in Row 2 alongside Roll and Surrender.
- **Rationale**: Discord allows up to 5 buttons per Action Row. Row 2 currently contains 2 buttons (`Roll` and `Surrender`), making it the ideal non-intrusive location without creating an additional row (Discord limit is 5 rows total).
- **Alternative Considered**: Adding a separate 4th Action Row just for refresh. (Rejected: wastes vertical message space and row limits).

### 2. Idempotent Refresh Handler
- **Choice**: `handleRefresh` performs `gameRepo.findById(gameId)` and returns `serializer.serializeGame(gameState)`.
- **Rationale**: Re-rendering with `type: 7` (UpdateMessage) updates the Discord embed and buttons in place instantly using the HTTP interaction response, without needing external REST API calls or consuming bot rate limits.

### 3. Open Turn Validation for Refresh
- **Choice**: Do not enforce `currentPlayer.playerId === interaction.user.id` on refresh interactions.
- **Rationale**: Refresh is a pure read operation. Allowing the non-active player to refresh allows them to check if their opponent has moved or if their own view was stuck.

## Risks / Trade-offs

- **[Risk] High-frequency button clicks** → **Mitigation**: Discord interactions already have client-side debouncing and rate limits. The handler only performs a single read query from D1/KV cache, so overhead is minimal.
- **[Risk] Reset of unsubmitted dice holds on refresh** → **Mitigation**: Refreshing intentionally restores the server-authoritative state (holds: `"00000"`). This is the expected recovery behavior when a player's view is stale or corrupted.
