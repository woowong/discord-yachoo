## 1. Integration Test Safety Net (Red Test First)

- [ ] 1.1 Analyze current `src/index.test.ts` and outline missing coverage for Webhook interaction scenarios (surrender, duplicate challenge, roll animation, category selection).
- [ ] 1.2 Implement mock environments (mock D1 Database, mock Discord Api Service) to support end-to-end webhook execution simulation.
- [ ] 1.3 Write integration tests for `/challenge` (single, multi, self-challenge prevent, duplicate check) to verify expected Discord Response payloads.
- [ ] 1.4 Write integration tests for `roll_` and `hold_` components to verify that background task fetching is scheduled and response state remains valid.
- [ ] 1.5 Write integration tests for `select_category` and confirmed surrender to verify ELO rating update, player stats upsert, match records insertion, and final board message patch.
- [ ] 1.6 Run the created test suite on the existing `index.ts` to ensure 100% of scenarios are passing (Green status) before any refactoring begins.

## 2. Localization & Message Resources Separation

- [ ] 2.1 Create `src/presentation/messages/ko.ts` to define static string pools (teasing templates, self-challenge warning, unauthorized alerts).
- [ ] 2.2 Relocate the teasing logic (`isLowScore`, `zeroStreak` checks) and celebratory randomizer functions from `index.ts` to a new helper module in `src/presentation/messages/`.
- [ ] 2.3 Update `src/index.ts` to invoke the localized message helper instead of using hardcoded string arrays.
- [ ] 2.4 Run the integration test suite to verify that gameplay responses and teasing text patterns remain identical.

## 3. Application Layer (GameWorkflowService) Implementation

- [ ] 3.1 Create the `GameWorkflowService` interface and error schemas using `Effect.ts` in `src/application/GameWorkflowService.ts`.
- [ ] 3.2 Implement `GameWorkflowServiceLive` by extracting business workflow orchestration (e.g., loading game -> making state change -> saving match -> triggering background stats update & discord API notification).
- [ ] 3.3 Ensure background execution tasks (like ELO calculation & Discord message edits) correctly receive and use `ExecutionContext` (`ctx.waitUntil`).
- [ ] 3.4 Update Unit and Integration tests to provide the new `GameWorkflowService` layer and confirm gameplay workflows pass.

## 4. Discord Interaction Dispatcher & Router Refactoring

- [ ] 4.1 Create `src/presentation/discord/router.ts` to act as a routing entry point, mapping commands and component customIds to specialized handler modules.
- [ ] 4.2 Create command handlers (`challenge`, `profile`, `leaderboard`, `history`) inside `src/presentation/discord/handlers/commands/`.
- [ ] 4.3 Create component action handlers (`roll`, `hold`, `selectCategory`, `surrender`) inside `src/presentation/discord/handlers/components/`.
- [ ] 4.4 Update `src/index.ts` to verify signatures, parse interactions, and immediately delegate to the discord router, keeping the entry file minimal (under 150 lines).
- [ ] 4.5 Clean up unused variables, inline helper functions, and raw db calls from `src/index.ts`.

## 5. Verification & Clean-up

- [ ] 5.1 Run all unit tests and the newly expanded integration test suite using `npm run test` to verify zero regression.
- [ ] 5.2 Launch and play through the console simulator (`npm run simulate`) to verify console interface rendering and engine operations are completely unaffected.
- [ ] 5.3 Verify formatting, lint rules, and TypeScript compile checks.
