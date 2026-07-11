## 1. Discord Presentation Layer Updates

- [x] 1.1 Update `serializeGame` in `src/presentation/discord/adapter/serializer.ts` to format and append the last turn action details from `state.turnHistory` if it's not empty.
- [x] 1.2 Update or add unit tests in `src/presentation/discord/adapter/adapter.test.ts` to verify that `serializeGame` outputs the correct "Last Turn Action" format when `turnHistory` contains records.

## 2. CLI Presentation Layer Updates

- [x] 2.1 Update `renderBoard` in `src/presentation/console/presenter.ts` to format and print the last turn action details if `turnHistory` is not empty and game is not Finished.
- [x] 2.2 Verify CLI presentation works by manually checking the output or executing existing console test suites.
