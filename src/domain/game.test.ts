import { describe, it, expect } from "vitest";
import { Effect, Exit, Cause } from "effect";
import { initGame, rollDice, selectCategory } from "./game";
import { DiceRoll } from "./types";

describe("Yacht Dice Game State Machine", () => {
  const players = [
    { playerId: "p1", playerName: "Alice" },
    { playerId: "p2", playerName: "Bob" }
  ] as const;

  // Predictable dice provider helper
  const mockDiceProvider = (roll: DiceRoll) => Effect.succeed(roll);

  describe("initGame", () => {
    it("should initialize a single-player game correctly", () => {
      const program = initGame([players[0]], "single");
      const state = Effect.runSync(program);

      expect(state.mode).toBe("single");
      expect(state.players).toHaveLength(1);
      expect(state.players[0].playerId).toBe("p1");
      expect(state.players[0].scoreBoard).toEqual({});
      expect(state.currentPlayerIndex).toBe(0);
      expect(state.status).toBe("Rolling");
      expect(state.rollCount).toBe(0);
    });

    it("should initialize a multi-player game correctly", () => {
      const program = initGame(players, "multi");
      const state = Effect.runSync(program);

      expect(state.mode).toBe("multi");
      expect(state.players).toHaveLength(2);
      expect(state.currentPlayerIndex).toBe(0);
      expect(state.status).toBe("Rolling");
      expect(state.rollCount).toBe(0);
    });
  });

  describe("rollDice", () => {
    it("should roll all dice on the first roll regardless of holds", () => {
      const setup = initGame([players[0]], "single");
      const program = Effect.flatMap(setup, (state) =>
        rollDice(state, [true, true, true, false, false], mockDiceProvider([6, 6, 6, 6, 6]))
      );

      const result = Effect.runSync(program);
      expect(result.currentDice).toEqual([6, 6, 6, 6, 6]);
      expect(result.rollCount).toBe(1);
      expect(result.status).toBe("Scoring");
    });

    it("should preserve held dice and roll only unheld dice on subsequent rolls", () => {
      const program = Effect.gen(function* () {
        const initialState = yield* initGame([players[0]], "single");
        // Roll 1: [5, 5, 5, 5, 5]
        const state1 = yield* rollDice(
          initialState,
          [false, false, false, false, false],
          mockDiceProvider([5, 5, 5, 5, 5])
        );
        // Roll 2: Keep indices 0, 2, 4 (all 5s), roll others with [1, 2, 1, 2, 1]
        // Unheld indices 1 and 3 will become 2 and 2, yielding [5, 2, 5, 2, 5]
        const state2 = yield* rollDice(
          state1,
          [true, false, true, false, true],
          mockDiceProvider([1, 2, 1, 2, 1])
        );
        return state2;
      });

      const result = Effect.runSync(program);
      expect(result.currentDice).toEqual([5, 2, 5, 2, 5]);
      expect(result.rollCount).toBe(2);
    });

    it("should fail when roll count exceeds 3", () => {
      const program = Effect.gen(function* () {
        const initialState = yield* initGame([players[0]], "single");
        const state1 = yield* rollDice(initialState, [false, false, false, false, false], mockDiceProvider([1, 1, 1, 1, 1]));
        const state2 = yield* rollDice(state1, [false, false, false, false, false], mockDiceProvider([1, 1, 1, 1, 1]));
        const state3 = yield* rollDice(state2, [false, false, false, false, false], mockDiceProvider([1, 1, 1, 1, 1]));
        // 4th roll should fail
        yield* rollDice(state3, [false, false, false, false, false], mockDiceProvider([1, 1, 1, 1, 1]));
      });

      const result = Effect.runSync(Effect.exit(program));
      expect(Exit.isFailure(result)).toBe(true);
      
      if (Exit.isFailure(result)) {
        const failures = Array.from(Cause.failures(result.cause));
        expect(failures[0]._tag).toBe("RollLimitExceededError");
      }
    });
  });

  describe("selectCategory", () => {
    it("should fail if selecting category before rolling the dice", () => {
      const program = Effect.gen(function* () {
        const state = yield* initGame([players[0]], "single");
        yield* selectCategory(state, "Aces");
      });

      const result = Effect.runSync(Effect.exit(program));
      expect(Exit.isFailure(result)).toBe(true);

      if (Exit.isFailure(result)) {
        const failures = Array.from(Cause.failures(result.cause));
        expect(failures[0]._tag).toBe("InvalidStateActionError");
      }
    });

    it("should successfully record score, apply bonus if >= 63, and transition turn in multi-player", () => {
      const program = Effect.gen(function* () {
        const state = yield* initGame(players, "multi");
        // Player 1 rolls: [6, 6, 6, 6, 6]
        const state1 = yield* rollDice(state, [false, false, false, false, false], mockDiceProvider([6, 6, 6, 6, 6]));
        // Player 1 chooses Sixes (6 * 5 = 30 points)
        const state2 = yield* selectCategory(state1, "Sixes");

        return state2;
      });

      const result = Effect.runSync(program);
      // Turn should transition to Player 2 (Bob)
      expect(result.currentPlayerIndex).toBe(1);
      expect(result.status).toBe("Rolling");
      expect(result.rollCount).toBe(0);

      // Player 1's score board should have Sixes = 30
      const p1 = result.players[0];
      expect(p1.scoreBoard.Sixes).toBe(30);
      expect(p1.totalScore).toBe(30);
      expect(p1.bonusScore).toBe(0);
    });

    it("should award 35 bonus points to upper section when total upper score is >= 63", () => {
      const program = Effect.gen(function* () {
        let state = yield* initGame([players[0]], "single");

        // We fill Sixes (30 pts)
        state = yield* rollDice(state, [false, false, false, false, false], mockDiceProvider([6, 6, 6, 6, 6]));
        state = yield* selectCategory(state, "Sixes");

        // We fill Fives (25 pts) - Upper total = 55
        state = yield* rollDice(state, [false, false, false, false, false], mockDiceProvider([5, 5, 5, 5, 5]));
        state = yield* selectCategory(state, "Fives");

        // We fill Fours (20 pts) - Upper total = 75 (eligibility threshold 63 met)
        state = yield* rollDice(state, [false, false, false, false, false], mockDiceProvider([4, 4, 4, 4, 4]));
        state = yield* selectCategory(state, "Fours");

        return state;
      });

      const result = Effect.runSync(program);
      const p1 = result.players[0];
      expect(p1.scoreBoard.Sixes).toBe(30);
      expect(p1.scoreBoard.Fives).toBe(25);
      expect(p1.scoreBoard.Fours).toBe(20);
      expect(p1.bonusScore).toBe(35);
      expect(p1.totalScore).toBe(30 + 25 + 20 + 35); // 110 points
    });

    it("should fail when selecting an already filled category", () => {
      const program = Effect.gen(function* () {
        let state = yield* initGame([players[0]], "single");
        state = yield* rollDice(state, [false, false, false, false, false], mockDiceProvider([1, 1, 1, 1, 1]));
        state = yield* selectCategory(state, "Aces");

        // Try to select Aces again on the next turn
        state = yield* rollDice(state, [false, false, false, false, false], mockDiceProvider([1, 1, 1, 1, 1]));
        yield* selectCategory(state, "Aces");
      });

      const result = Effect.runSync(Effect.exit(program));
      expect(Exit.isFailure(result)).toBe(true);

      if (Exit.isFailure(result)) {
        const failures = Array.from(Cause.failures(result.cause));
        expect(failures[0]._tag).toBe("CategoryAlreadyFilledError");
      }
    });
  });

  describe("Game Completion", () => {
    it("should transition game to Finished state after filling all 12 categories in single player", () => {
      const categories: any[] = [
        "Aces", "Deuces", "Treys", "Fours", "Fives", "Sixes",
        "Choice", "FourOfAKind", "FullHouse", "SmallStraight", "LargeStraight", "Yacht"
      ];

      const program = Effect.gen(function* () {
        let state = yield* initGame([players[0]], "single");

        for (const cat of categories) {
          state = yield* rollDice(state, [false, false, false, false, false], mockDiceProvider([6, 6, 6, 6, 6]));
          state = yield* selectCategory(state, cat);
        }

        return state;
      });

      const result = Effect.runSync(program);
      expect(result.status).toBe("Finished");
    });
  });

  describe("Turn History and Roll Tracking", () => {
    it("should track dice rolls within a turn and commit them to turnHistory on category selection", () => {
      const program = Effect.gen(function* () {
        const state = yield* initGame([players[0]], "single");
        // Roll 1: [1, 2, 3, 4, 5]
        const state1 = yield* rollDice(state, [false, false, false, false, false], mockDiceProvider([1, 2, 3, 4, 5]));
        // Roll 2: Keep [1, 2, 3, 4], roll 5th die, result [1, 2, 3, 4, 6]
        const state2 = yield* rollDice(state1, [true, true, true, true, false], mockDiceProvider([1, 1, 1, 1, 6]));
        
        expect(state2.currentTurnRolls).toEqual([
          [1, 2, 3, 4, 5],
          [1, 2, 3, 4, 6]
        ]);
        expect(state2.turnHistory).toHaveLength(0);

        // Select category "Choice" (value: 1+2+3+4+6 = 16)
        const state3 = yield* selectCategory(state2, "Choice");

        // After category selection:
        // - turnHistory should contain 1 record
        // - currentTurnRolls should be reset to empty
        expect(state3.turnHistory).toHaveLength(1);
        expect(state3.currentTurnRolls).toHaveLength(0);

        const record = state3.turnHistory[0];
        expect(record.playerIndex).toBe(0);
        expect(record.playerName).toBe("Alice");
        expect(record.turnNumber).toBe(1);
        expect(record.rolls).toEqual([
          [1, 2, 3, 4, 5],
          [1, 2, 3, 4, 6]
        ]);
        expect(record.category).toBe("Choice");
        expect(record.score).toBe(16);

        return state3;
      });

      Effect.runSync(program);
    });
  });
});

