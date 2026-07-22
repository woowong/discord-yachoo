## 1. Domain Layer & State Machine

- [x] 1.1 Update `InProgressGameState` type definition in `src/domain/types.ts` to include optional `pendingSurrenderOfferByPlayerId`
- [x] 1.2 Implement `offerSurrender`, `acceptSurrender`, and `declineSurrender` domain functions in `src/domain/game.ts`
- [x] 1.3 Update `rollDice` and `selectCategory` in `src/domain/game.ts` to automatically clear `pendingSurrenderOfferByPlayerId`
- [x] 1.4 Add comprehensive unit tests in `src/domain/game.test.ts` for surrender proposal, acceptance, decline, and auto-clearing

## 2. Presentation Layer & Discord Handlers

- [x] 2.1 Update `serializeRollingMessage` in `src/presentation/discord/adapter/serializer.ts` to render dice hold button labels as `isHeld ? "🔒" : [idx + 1]`
- [x] 2.2 Implement `offer_surrender`, `accept_surrender`, and `decline_surrender` interaction handlers in `src/presentation/discord/handlers/components.ts`
- [x] 2.3 Add authorization checks ensuring only the target opponent can accept or decline a surrender proposal
- [x] 2.4 Update presentation tests in `src/presentation/discord/adapter/adapter.test.ts` and `src/index.test.ts`

## 3. Web Dashboard Replay Enhancements

- [x] 3.1 Update `dashboardHtml.ts` replay modal JavaScript to calculate and render relative score differential (Δ Diff) column
- [x] 3.2 Verify replay modal layout and styling across single and multiplayer replay logs
