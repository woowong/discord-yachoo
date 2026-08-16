## 1. Discord Serializer Update

- [x] 1.1 Add the `[ 🔄 새로고침 ]` button (`refresh_game`, Secondary style) to Row 2 in `src/presentation/discord/adapter/serializer.ts`
- [x] 1.2 Update serializer unit tests in `src/presentation/discord/adapter/adapter.test.ts` to assert the presence of `refresh_game` button in Row 2

## 2. Component Handler & Router

- [x] 2.1 Implement `handleRefresh` in `src/presentation/discord/handlers/components.ts` to serialize and return the latest `GameState` via `type: 7`
- [x] 2.2 Wire `refresh_game` interaction routing in `src/presentation/discord/router.ts`

## 3. End-to-End & Integration Testing

- [x] 3.1 Add integration test cases in `src/index.test.ts` for `refresh_game` component interaction in both active and finished game states
- [x] 3.2 Run `npm test` to verify all unit and integration tests pass
