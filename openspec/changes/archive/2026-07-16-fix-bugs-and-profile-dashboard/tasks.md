## 1. Fix Existing Bugs

- [x] 1.1 Update teasing notifications in [ko.ts](file:///Users/woowong/private/discord-yachoo/src/presentation/messages/ko.ts) to receive and render player IDs instead of nicknames for valid mentions.
- [x] 1.2 Modify surrender confirmation button custom ID in [components.ts](file:///Users/woowong/private/discord-yachoo/src/presentation/discord/handlers/components.ts) to include `gameId` as a prefix segment.
- [x] 1.3 Add routing bypass in [router.ts](file:///Users/woowong/private/discord-yachoo/src/presentation/discord/router.ts) to resolve `gameId` from the custom ID when it starts with `confirm_surrender_`.
- [x] 1.4 Update [index.ts](file:///Users/woowong/private/discord-yachoo/src/index.ts) log annotation to resolve `gameId` from the custom ID when it starts with `confirm_surrender_`.

## 2. Extend Persistence & Stats Calculations

- [x] 2.1 Add SQL query method to [MatchRepository](file:///Users/woowong/private/discord-yachoo/src/persistence/repository.ts) for retrieving a player's overall average score.
- [x] 2.2 Implement the new average score retrieval method in [repository.ts](file:///Users/woowong/private/discord-yachoo/src/persistence/d1/repository.ts) for D1.
- [x] 2.3 Modify `/profile` slash command in [commands.ts](file:///Users/woowong/private/discord-yachoo/src/presentation/discord/handlers/commands.ts) to compute and display average scores and recent 10 matches (W/L/D).
- [x] 2.4 Implement parsing logic for `history_json` to identify and tag "Legend Matches" (Comeback Win, Hot Streak, Yacht Completed, Epic Fail).

## 3. Web Dashboard Implementation

- [x] 3.1 Add request-level path checking in [index.ts](file:///Users/woowong/private/discord-yachoo/src/index.ts) to route browser GET requests to `/` and `/web/*` without signature checks.
- [x] 3.2 Implement API handler endpoints `/web/api/profile/:playerId` and `/web/api/legend` in the Cloudflare Worker.
- [x] 3.3 Design and implement the single-page Web Dashboard HTML/CSS/JS with a dark mode glassmorphic UI.
- [x] 3.4 Serve the Web Dashboard single-page application at GET `/` and `/web/`.

## 4. Verification & Testing

- [x] 4.1 Update integration tests in [index.test.ts](file:///Users/woowong/private/discord-yachoo/src/index.test.ts) to align with the modified surrender custom ID structure.
- [x] 4.2 Verify all existing and new tests pass successfully via `npm test`.
