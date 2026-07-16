## 1. Extend Persistence (Player Listing)

- [x] 1.1 Add `getAllPlayers` method signature to `PlayerRepository` interface in [repository.ts](file:///Users/woowong/private/discord-yachoo/src/persistence/repository.ts).
- [x] 1.2 Implement the `getAllPlayers` query in [repository.ts](file:///Users/woowong/private/discord-yachoo/src/persistence/d1/repository.ts) sorting by ELO rating.

## 2. Web API & Web UI Extensions

- [x] 2.1 Expose a new `GET /web/api/players` endpoint in [router.ts](file:///Users/woowong/private/discord-yachoo/src/presentation/web/router.ts) that fetches the active players list.
- [x] 2.2 Integrate the Player Directory list container in [dashboardHtml.ts](file:///Users/woowong/private/discord-yachoo/src/presentation/web/dashboardHtml.ts) to display players on page load.
- [x] 2.3 Convert static player nicknames in matches history and turn logs into clickable links triggering profile search.
- [x] 2.4 Add interactive tag-based filters (Yacht, Comeback, Hot Streak, Epic Fail) to the Legend Matches tab.
- [x] 2.5 Apply compact CSS spacing tokens (shrink th/td padding, card margins, and modal rows).

## 3. Verification & Testing

- [x] 3.1 Add integration test in [index.test.ts](file:///Users/woowong/private/discord-yachoo/src/index.test.ts) verifying the `GET /web/api/players` endpoint.
- [x] 3.2 Run and verify the entire test suite passes via `npm test`.
