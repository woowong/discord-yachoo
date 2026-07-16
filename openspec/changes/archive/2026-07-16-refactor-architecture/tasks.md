## 1. Integration Test Safety Net (Red Test First)

- [x] 1.1 Analyze current `src/index.test.ts` and outline missing coverage for Webhook interaction scenarios (surrender, duplicate challenge, roll animation, category selection).
- [x] 1.2 Implement mock environments (mock D1 Database, mock Discord Api Service) to support end-to-end webhook execution simulation.
- [x] 1.3 Write integration tests for `/challenge` (single, multi, self-challenge prevent, duplicate check) to verify expected Discord Response payloads.
- [x] 1.4 Write integration tests for `roll_` and `hold_` components to verify that background task fetching is scheduled and response state remains valid.
- [x] 1.5 Write integration tests for `select_category` and confirmed surrender to verify ELO rating update, player stats upsert, match records insertion, and final board message patch.
- [x] 1.6 Run the created test suite on the existing `index.ts` to ensure 100% of scenarios are passing (Green status) before any refactoring begins.

## 2. Localization & Message Resources Separation

- [x] 2.1 Create `src/presentation/messages/ko.ts` to define static string pools (teasing templates, self-challenge warning, unauthorized alerts).
- [x] 2.2 Relocate the teasing logic (`isLowScore`, `zeroStreak` checks) and celebratory randomizer functions from `index.ts` to a new helper module in `src/presentation/messages/`.
- [x] 2.3 Update `src/index.ts` to invoke the localized message helper instead of using hardcoded string arrays.
- [x] 2.4 Run the integration test suite to verify that gameplay responses and teasing text patterns remain identical.

## 3. Application Layer (GameWorkflowService) Implementation

- [x] 3.1 Create the `GameWorkflowService` interface and error schemas using `Effect.ts` in `src/application/GameWorkflowService.ts`.
- [x] 3.2 Implement `GameWorkflowServiceLive` by extracting business workflow orchestration (e.g., loading game -> making state change -> saving match -> triggering background stats update & discord API notification).
- [x] 3.3 Ensure background execution tasks (like ELO calculation & Discord message edits) correctly receive and use `ExecutionContext` (`ctx.waitUntil`).
- [x] 3.4 Update Unit and Integration tests to provide the new `GameWorkflowService` layer and confirm gameplay workflows pass.

## 4. Discord Interaction Dispatcher & Router Refactoring

- [x] 4.1 Create `src/presentation/discord/router.ts` to manage modular routing for commands and components.
- [x] 4.2 Decouple slash command handlers (`challenge`, `profile`, `leaderboard`, `history`) from `src/index.ts` to `src/presentation/discord/handlers/commands.ts`.
- [x] 4.3 Decouple component interaction handlers (`roll`, `hold`, `selectCategory`, `surrender`, `confirmSurrender`, history pagers) from `src/index.ts` to `src/presentation/discord/handlers/components.ts`.
- [x] 4.4 Update `src/index.ts` to verify signatures, parse interactions, and immediately delegate to the discord router, keeping the entry file minimal (under 150 lines).
- [x] 4.5 Clean up unused imports, inline helper functions, direct database/persistence references, and dead variables inside the entry file.

## 5. Verification & Clean-up

- [x] 5.1 Run all unit tests and the newly expanded integration test suite using `npm run test` to verify zero regression.
- [x] 5.2 Launch and play through the console simulator (`npm run simulate`) to verify console interface rendering and engine operations are completely unaffected.
- [x] 5.3 Verify formatting, lint rules, and TypeScript compile checks.
