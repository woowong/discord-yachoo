## 1. Domain Errors Implementation

- [x] 1.1 Extend JS standard Error in custom domain error classes
- [x] 1.2 Add super() calls with descriptive messages in domain errors

## 2. Discord Serializer UI Cleanup

- [x] 2.1 Pass empty components list instead of undefined on Finished game status in serializeGame

## 3. Testing and Verification

- [x] 3.1 Implement unit test for serializeGame Finished status components
- [x] 3.2 Implement integration test for readable GameAlreadyOverError on finished game roll interaction
- [x] 3.3 Verify all tests pass locally using npm run test

## 4. Graceful GameAlreadyOverError UI Refresh Recovery

- [x] 4.1 Catch `GameAlreadyOverError` in `roll_` interaction handler and return current finished game state
- [x] 4.2 Catch `GameAlreadyOverError` in `select_category` interaction handler and return current finished game state
- [x] 4.3 Add test cases verifying that clicking buttons on a finished game message successfully removes components
