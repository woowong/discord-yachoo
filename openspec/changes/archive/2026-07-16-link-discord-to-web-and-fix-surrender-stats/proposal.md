## Why

- **Isolated Ecosystems**: Discord bot commands and web dashboard operate independently without any cross-linking, preventing users from clicking through from Discord to their dynamic profile stats and game replays.
- **Generic Match Outcomes**: Games won/lost via surrender are labeled as normal wins/losses, hiding whether a match ended prematurely via forfeit (KO).
- **Skewed Average Scores**: Including surrendered matches (where scores are naturally low because the game ended early) drags down a player's average score, making the average score metric uninformative.

## What Changes

- **Organic Dashboard Linking**: 
  - Add hyperlinked buttons/text pointing to the Web Dashboard at the end of `/profile`, `/leaderboard`, and `/history` commands.
  - Include dashboard replay links in game completion notifications (finished, surrendered, draw) inside Discord.
- **Surrender (KO) Tracking**:
  - Introduce a `surrendered_id` column to the `matches` table to record which player forfeited.
  - Render surrender results as `Won (KO)` or `Lost (KO)` (기권패/KO) in Discord history lists and Web Dashboard tables.
- **Accurate Average Scores**:
  - Modify the player average score calculations to exclude matches where a surrender occurred.

## Capabilities

### New Capabilities
*(None)*

### Modified Capabilities
- `persistence-repository`: Update requirements to store a `surrenderedId` field in D1 matches table, and modify ELO/average score queries to filter out surrendered matches.
- `web-dashboard`: Update UI list elements and replay tables to show surrender indicators (KO).
- `game-orchestrator`: Update the output format of `/profile`, `/leaderboard`, `/history` commands and game end templates to embed web dashboard URLs.

## Impact

- **Database**: Add `surrendered_id` column to the D1 `matches` table via a new migration file.
- **Affected Files**:
  - [repository.ts](file:///Users/woowong/private/discord-yachoo/src/persistence/repository.ts) & [repository.ts](file:///Users/woowong/private/discord-yachoo/src/persistence/d1/repository.ts) (MatchRecord model update, migration, average score query modification).
  - [serializer.ts](file:///Users/woowong/private/discord-yachoo/src/presentation/discord/adapter/serializer.ts) (Add KO display in history list, add web dashboard links in leaderboard and history embeds).
  - [commands.ts](file:///Users/woowong/private/discord-yachoo/src/presentation/discord/handlers/commands.ts) (Add web dashboard link to profile response).
  - [GameWorkflowService.ts](file:///Users/woowong/private/discord-yachoo/src/application/GameWorkflowService.ts) (Save `surrenderedId` in match records).
  - [ko.ts](file:///Users/woowong/private/discord-yachoo/src/presentation/messages/ko.ts) (Embed web dashboard links in game over/surrender notifications).
  - [dashboardHtml.ts](file:///Users/woowong/private/discord-yachoo/src/presentation/web/dashboardHtml.ts) (Display KO/기권패 in recent matches table).
