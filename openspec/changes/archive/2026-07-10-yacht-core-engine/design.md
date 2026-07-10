## Context

The Yacht Dice (야추 다이스) game core engine contains the business logic, score calculations, and state transition machine. According to the architecture principles defined in `AGENTS.md`, this core domain layer must be completely pure, meaning it has zero side effects and does not depend on any external systems (such as the Discord Webhook API, Cloudflare D1 database, or file systems). 

This design document outlines how we will construct the immutable domain models, pure score calculation rules, and safe state transition machine using TypeScript and the Effect.ts ecosystem.

## Goals / Non-Goals

**Goals:**
* **Pure & Testable Core**: Implement all score rules and game state logic as pure functions that are 100% verifiable via unit tests.
* **Effect.ts Compatibility**: Utilize Effect.ts features (such as `Effect` and safe error handling) to handle business errors explicitly without relying on `throw/catch`.
* **Deterministic Dice Rolling**: Separate randomness (the side-effect of rolling dice) from state transitions, allowing tests to inject specific dice values.
* **Flexible Player Modes**: Support both Single Player (practice mode) and Multi Player (2-player duel) with consistent state structures.

**Non-Goals:**
* **Discord Integration**: Formatting Discord embeds, buttons, or managing Discord API webhooks.
* **Persistence**: Storing ongoing game sessions in Cloudflare D1 or KV (this belongs to the persistence layer).
* **Network & I/O**: Accessing HTTP endpoints, local databases, or logging to external services.

## Decisions

### Decision 1: Immutable Domain State and Type Definitions
We will define strict domain types in `src/domain/types.ts`. All types representing the game state will be read-only to enforce immutability.

```typescript
export type Dice = 1 | 2 | 3 | 4 | 5 | 6;
export type DiceRoll = readonly [Dice, Dice, Dice, Dice, Dice];
export type DiceHold = readonly [boolean, boolean, boolean, boolean, boolean];

export type ScoreCategory =
  | "Aces"
  | "Deuces"
  | "Treys"
  | "Fours"
  | "Fives"
  | "Sixes"
  | "Choice"
  | "FourOfAKind"
  | "FullHouse"
  | "SmallStraight"
  | "LargeStraight"
  | "Yacht";

export type ScoreBoard = Partial<Record<ScoreCategory, number>>;

export interface PlayerState {
  readonly playerId: string;
  readonly playerName: string;
  readonly scoreBoard: ScoreBoard;
  readonly bonusScore: number; // 35 if sum of upper section >= 63, otherwise 0
  readonly totalScore: number;
}

export type GameMode = "single" | "multi";
export type GameStatus = "Init" | "Rolling" | "Scoring" | "Finished";

export interface GameState {
  readonly gameId: string;
  readonly mode: GameMode;
  readonly players: readonly PlayerState[];
  readonly currentPlayerIndex: number;
  readonly status: GameStatus;
  readonly currentDice: DiceRoll;
  readonly rollCount: number; // 0 to 3
}
```

### Decision 2: Functional Error Handling with Effect.ts
Instead of throwing exceptions, we will model all business errors as custom TypeScript classes and return them via `Effect.fail`. This ensures the compiler forces caller functions to handle these errors.

```typescript
export class GameAlreadyOverError {
  readonly _tag = "GameAlreadyOverError";
  constructor(readonly gameId: string) {}
}

export class RollLimitExceededError {
  readonly _tag = "RollLimitExceededError";
  constructor(readonly currentRollCount: number) {}
}

export class CategoryAlreadyFilledError {
  readonly _tag = "CategoryAlreadyFilledError";
  constructor(readonly category: ScoreCategory) {}
}

export class InvalidStateActionError {
  readonly _tag = "InvalidStateActionError";
  constructor(readonly message: string) {}
}

export type GameError =
  | GameAlreadyOverError
  | RollLimitExceededError
  | CategoryAlreadyFilledError
  | InvalidStateActionError;
```

### Decision 3: Deterministic Randomness Injector for Rolling
To keep the state machine pure and deterministic, the `rollDice` function will accept an `Effect<DiceRoll, never>` or directly a provider that yields a `DiceRoll`. During tests, we can provide a mock that returns fixed dice. In production, a crypto-secure random number generator will be supplied.

```typescript
export const rollDice = (
  state: GameState,
  holds: DiceHold,
  rollProvider: Effect.Effect<DiceRoll, never>
): Effect.Effect<GameState, GameError> => {
  // Logic to only replace unheld dice and update state
}
```

### Decision 4: Score Rules Engine Implementation
The scoring engine will consist of standalone pure functions in `src/domain/score.ts`.
* **Full House**: If the dice represent a Yacht (5 of a kind), it can be scored under Full House (yielding the sum of all dice, e.g., `[5, 5, 5, 5, 5]` = 25 points).
* **Small Straight**: 4 consecutive values score a flat 15 points. Large straights also satisfy the small straight condition and can be written as 15 points in the Small Straight category.
* **Large Straight**: 5 consecutive values score a flat 30 points.

## Risks / Trade-offs

* **[Risk] Immutability Performance overhead** → Spread operators (`{ ...state }`) and array mapping create new object references on every action.
  * *Mitigation*: The state of a Yacht game is extremely small (less than 1KB). Modern JS engines handle thousands of such allocations per millisecond without noticeable lag. Immutability is highly worth the safety trade-off.
* **[Risk] Effect.ts Complexity for simple domain logic** → Developers unfamiliar with Effect.ts might find generator syntax or functional pipelines harder to read.
  * *Mitigation*: We will keep the domain layer as simple as possible. We will use `Effect.gen` and standard TypeScript control flows inside generators, avoiding complex combinations of operators where possible.
