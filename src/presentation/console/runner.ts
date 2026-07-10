import { Effect } from "effect";
import { DiceHold, DiceRoll, GameMode, GameState, ScoreCategory } from "../../domain/types";
import { initGame, rollDice, selectCategory } from "../../domain/game";
import { GameRepository } from "../../persistence/memory/repository";
import { ConsolePresenter } from "./presenter";
import { Terminal } from "./terminal";
import { calculateScore } from "../../domain/score";

const randomDice = (): 1 | 2 | 3 | 4 | 5 | 6 =>
  (Math.floor(Math.random() * 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6;

const rollProvider: Effect.Effect<DiceRoll, never> = Effect.sync(() => [
  randomDice(),
  randomDice(),
  randomDice(),
  randomDice(),
  randomDice()
]);

const CATEGORY_MAP: Record<string, ScoreCategory> = {
  "1": "Aces",
  "2": "Deuces",
  "3": "Treys",
  "4": "Fours",
  "5": "Fives",
  "6": "Sixes",
  "7": "Choice",
  "8": "FourOfAKind",
  "9": "FullHouse",
  "10": "SmallStraight",
  "11": "LargeStraight",
  "12": "Yacht"
};

const CATEGORY_LABELS: Record<ScoreCategory, string> = {
  Aces: "Aces (1)",
  Deuces: "Deuces (2)",
  Treys: "Treys (3)",
  Fours: "Fours (4)",
  Fives: "Fives (5)",
  Sixes: "Sixes (6)",
  Choice: "Choice (7)",
  FourOfAKind: "4 of a Kind (8)",
  FullHouse: "Full House (9)",
  SmallStraight: "Small Straight (10)",
  LargeStraight: "Large Straight (11)",
  Yacht: "Yacht (12)"
};

const askGameMode = (terminal: Terminal) =>
  Effect.gen(function* () {
    while (true) {
      const input = yield* terminal.readline("Select Game Mode (1: Single, 2: Multi): ");
      const val = input.trim();
      if (val === "1") return "single";
      if (val === "2") return "multi";
      yield* terminal.writeLine("Invalid selection. Please choose 1 or 2.");
    }
  });

const setupGame = () =>
  Effect.gen(function* () {
    const terminal = yield* Terminal;
    const mode = yield* askGameMode(terminal);
    
    const players: { playerId: string; playerName: string }[] = [];
    if (mode === "single") {
      const name = yield* terminal.readline("Enter Player Name (default: PlayerA): ");
      players.push({
        playerId: "player-1",
        playerName: name.trim() || "PlayerA"
      });
    } else {
      const name1 = yield* terminal.readline("Enter Player 1 Name (default: Player1): ");
      const name2 = yield* terminal.readline("Enter Player 2 Name (default: Player2): ");
      players.push(
        { playerId: "player-1", playerName: name1.trim() || "Player1" },
        { playerId: "player-2", playerName: name2.trim() || "Player2" }
      );
    }
    
    return yield* initGame(players, mode);
  });

const playTurn = (gameId: string) =>
  Effect.gen(function* () {
    const terminal = yield* Terminal;
    const presenter = yield* ConsolePresenter;
    const repo = yield* GameRepository;

    // Load state
    const stateOpt = yield* repo.findById(gameId);
    if (stateOpt._tag === "None") {
      yield* presenter.renderError("Game state not found.");
      return;
    }
    let state = stateOpt.value;

    // 1. Roll phase
    while (state.status === "Rolling" || state.status === "Scoring") {
      yield* presenter.renderBoard(state);


      // If rollCount is 0, we must roll the first roll automatically
      if (state.rollCount === 0) {
        yield* terminal.readline("Press Enter to roll the dice...");
        const nextState = yield* rollDice(state, [false, false, false, false, false], rollProvider);
        yield* repo.save(nextState);
        state = nextState;
        continue;
      }

      // If rollCount is 1 or 2, we can hold and roll, or go to scoring
      if (state.rollCount < 3) {
        const input = yield* terminal.readline(
          "Enter indices to hold (1-5 separated by spaces, e.g., '1 2 5') or press Enter to roll all, or type 'score' to record score: "
        );

        const trimmed = input.trim().toLowerCase();
        if (trimmed === "score") {
          state = { ...state, status: "Scoring" };
          yield* repo.save(state);
          break;
        }

        const holds: [boolean, boolean, boolean, boolean, boolean] = [false, false, false, false, false];
        let isValid = true;
        if (trimmed.length > 0) {
          const parts = trimmed.split(/\s+/);
          for (const part of parts) {
            const num = parseInt(part, 10);
            if (num >= 1 && num <= 5) {
              holds[num - 1] = true;
            } else {
              isValid = false;
              break;
            }
          }
        }

        if (!isValid) {
          yield* presenter.renderError("Invalid hold input. Use numbers 1 to 5 separated by spaces.");
          yield* terminal.readline("Press Enter to continue...");
          continue;
        }

        const nextState = yield* rollDice(state, holds, rollProvider);
        yield* repo.save(nextState);
        state = nextState;
      } else {
        break; // Max 3 rolls reached, proceed to scoring
      }
    }

    // 2. Scoring phase
    const currentPlayer = state.players[state.currentPlayerIndex];
    while (true) {
      yield* presenter.renderBoard(state);
      yield* terminal.writeLine(`Available Categories for ${currentPlayer.playerName}:`);
      
      Object.entries(CATEGORY_MAP).forEach(([key, category]) => {
        const alreadyScored = currentPlayer.scoreBoard[category] !== undefined;
        let statusStr = "";
        if (alreadyScored) {
          statusStr = `[Scored: ${currentPlayer.scoreBoard[category]}]`;
        } else {
          const expected = calculateScore(category, state.currentDice);
          statusStr = `[Available] (Expected: ${expected} pts)`;
        }
        console.log(`  ${key.padStart(2)}. ${CATEGORY_LABELS[category].padEnd(20)} : ${statusStr}`);
      });

      const input = yield* terminal.readline("Select category number to write score (1-12): ");
      const selectedCat = CATEGORY_MAP[input.trim()];

      if (!selectedCat) {
        yield* presenter.renderError("Invalid selection. Choose a number between 1 and 12.");
        yield* terminal.readline("Press Enter to continue...");
        continue;
      }

      if (currentPlayer.scoreBoard[selectedCat] !== undefined) {
        yield* presenter.renderError("This category has already been scored.");
        yield* terminal.readline("Press Enter to continue...");
        continue;
      }

      const resultEither = yield* Effect.either(selectCategory(state, selectedCat));
      if (resultEither._tag === "Right") {
        const nextState = resultEither.right;
        yield* repo.save(nextState);
        break; // Successfully scored and transitioned turn
      } else {
        yield* presenter.renderError(resultEither.left._tag);
        yield* terminal.readline("Press Enter to continue...");
      }
    }
  });

export const runGame = () =>
  Effect.gen(function* () {
    const presenter = yield* ConsolePresenter;
    const repo = yield* GameRepository;

    const initialState = yield* setupGame();
    yield* repo.save(initialState);
    const gameId = initialState.gameId;

    let state = initialState;

    while (state.status !== "Finished") {
      yield* playTurn(gameId);
      const stateOpt = yield* repo.findById(gameId);
      if (stateOpt._tag === "None") break;
      state = stateOpt.value;
    }

    // Final board presentation
    yield* presenter.renderBoard(state);
  });
