## 1. Presentation Layer Updates

- [x] 1.1 Standardize surrender button label in `serializeRolling` to omit `label` (icon-only `🏳️`), matching `serializeGame` in `src/presentation/discord/adapter/serializer.ts`
- [x] 1.2 Reformat `Current Dice` section in `serializeGame` of `src/presentation/discord/adapter/serializer.ts` to single horizontal line format with lock icons (`🔒`) for held dice

## 2. Test Verification

- [x] 2.1 Update unit test assertions in `src/presentation/discord/adapter/adapter.test.ts` to expect horizontal dice layout
- [x] 2.2 Run full test suite with `npx vitest run` to ensure 100% test pass
