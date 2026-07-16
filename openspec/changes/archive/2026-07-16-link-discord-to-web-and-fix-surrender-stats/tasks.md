## 1. Database Migration & Repository Extensions

- [x] 1.1 Create migration file `migrations/0008_add_surrendered_id.sql` adding `surrendered_id TEXT` to the matches table.
- [x] 1.2 Update `MatchRecord` interface in [repository.ts](file:///Users/woowong/private/discord-yachoo/src/persistence/repository.ts) to include `surrenderedId: string | null`.
- [x] 1.3 Update D1 row mapper `mapRowToMatchRecord` and `saveMatch` parameter bindings in [repository.ts](file:///Users/woowong/private/discord-yachoo/src/persistence/d1/repository.ts) to handle `surrendered_id`.
- [x] 1.4 Exclude surrendered matches from `getPlayerAverageScore` queries in [repository.ts](file:///Users/woowong/private/discord-yachoo/src/persistence/d1/repository.ts).

## 2. GameWorkflow & Discord Linkage

- [x] 2.1 Update `GameWorkflowService.ts` to pass the `surrenderedPlayerId` into the `saveMatch` payload on surrender.
- [x] 2.2 Add web dashboard hyperlinks to `/profile` slash command in [commands.ts](file:///Users/woowong/private/discord-yachoo/src/presentation/discord/handlers/commands.ts).
- [x] 2.3 Embed dashboard redirection URLs in `/leaderboard`, `/history` lists, and `/history` details in [serializer.ts](file:///Users/woowong/private/discord-yachoo/src/presentation/discord/adapter/serializer.ts).
- [x] 2.4 Update game completion/surrender text templates in [ko.ts](file:///Users/woowong/private/discord-yachoo/src/presentation/messages/ko.ts) to append replay links.
- [x] 2.5 Render `기권패 (KO)` outcome markers for surrendered games in `/history` output inside [serializer.ts](file:///Users/woowong/private/discord-yachoo/src/presentation/discord/adapter/serializer.ts).

## 3. Web Dashboard Updates

- [x] 3.1 Update match history rows in [dashboardHtml.ts](file:///Users/woowong/private/discord-yachoo/src/presentation/web/dashboardHtml.ts) to identify and display KO / 기권패 results.

## 4. Verification & Testing

- [x] 4.1 Update integration tests in [index.test.ts](file:///Users/woowong/private/discord-yachoo/src/index.test.ts) to verify the new links, ELO logic, and database state.
- [x] 4.2 Run and verify the entire test suite passes via `npm test`.
