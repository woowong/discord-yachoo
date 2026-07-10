## 1. Domain Types and Error Models Setup

- [x] 1.1 Create `src/domain/types.ts` and define read-only domain types (Dice, DiceRoll, ScoreCategory, ScoreBoard, GameState)
- [x] 1.2 Define domain error classes (`GameAlreadyOverError`, `RollLimitExceededError`, `CategoryAlreadyFilledError`, `InvalidStateActionError`) in `src/domain/errors.ts`

## 2. Yacht Score Calculation Engine

- [x] 2.1 Implement Aces through Sixes score calculation in `src/domain/score.ts`
- [x] 2.2 Implement Choice and Four of a Kind score calculation in `src/domain/score.ts`
- [x] 2.3 Implement Full House score calculation (supporting Yacht as a valid Full House score) in `src/domain/score.ts`
- [x] 2.4 Implement Small Straight (15 pts) and Large Straight (30 pts) score calculation in `src/domain/score.ts`
- [x] 2.5 Implement Yacht (50 pts) and Upper Section Bonus (35 pts for score >= 63) score calculation in `src/domain/score.ts`
- [x] 2.6 Write unit tests verifying all 12 categories and subtotal bonus logic in `src/domain/score.test.ts`

## 3. Game State Machine Implementation

- [x] 3.1 Implement `initGame` function to initialize a new game in `src/domain/game.ts`
- [x] 3.2 Implement `rollDice` functional state transition using an external `DiceRoll` generator for predictability in `src/domain/game.ts`
- [x] 3.3 Implement `selectCategory` to record score, recalculate total and bonus scores in `src/domain/game.ts`
- [x] 3.4 Implement turn transition and game completion logic in `src/domain/game.ts`
- [x] 3.5 Write unit tests for all game actions and transitions (e.g. roll limits, category double-fills) in `src/domain/game.test.ts`
