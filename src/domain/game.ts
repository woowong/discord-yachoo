import { Effect } from "effect";
import { DiceRoll, DiceHold, GameState, GameMode, ScoreCategory, PlayerState } from "./types";
import {
  GameAlreadyOverError,
  RollLimitExceededError,
  CategoryAlreadyFilledError,
  InvalidStateActionError,
  AllDiceHeldError,
  GameError
} from "./errors";
import { calculateScore, calculateUpperSectionSum, calculateUpperBonus } from "./score";

// Helper to generate a random ID
const generateId = (): string => Math.random().toString(36).substring(2, 9);

/**
 * Initializes a new Yacht game.
 */
export const initGame = (
  players: readonly { readonly playerId: string; readonly playerName: string }[],
  mode: GameMode
): Effect.Effect<GameState, never> => {
  return Effect.gen(function* () {
    const playerStates: PlayerState[] = players.map((p) => ({
      playerId: p.playerId,
      playerName: p.playerName,
      scoreBoard: {},
      bonusScore: 0,
      totalScore: 0
    }));

    const initialState: GameState = {
      gameId: generateId(),
      mode,
      players: playerStates,
      currentPlayerIndex: 0,
      status: "Rolling",
      currentDice: [1, 1, 1, 1, 1],
      rollCount: 0,
      turnHistory: [],
      currentTurnRolls: []
    };

    return initialState;
  });
};

/**
 * Rolls the dice for the active player.
 * Random dice are obtained from the provided `rollProvider` effect.
 */
export const rollDice = (
  state: GameState,
  holds: DiceHold,
  rollProvider: Effect.Effect<DiceRoll, never>
): Effect.Effect<GameState, GameError> => {
  return Effect.gen(function* () {
    // 1. Check if game is finished
    if (state.status === "Finished") {
      yield* Effect.fail(new GameAlreadyOverError(state.gameId));
    }

    // 2. Check if roll count exceeds limit
    if (state.rollCount >= 3) {
      yield* Effect.fail(new RollLimitExceededError(state.rollCount));
    }

    // 2.5. Check if all dice are held (and it's not the first roll)
    if (state.rollCount > 0 && holds.every((h) => h)) {
      yield* Effect.fail(new AllDiceHeldError());
    }

    // 3. Get the new dice roll from the provider
    const newRoll = yield* rollProvider;

    // 4. Determine final dice based on hold status
    // If it's the first roll (rollCount === 0), ignore holds and roll all dice.
    const finalDice: DiceRoll = state.rollCount === 0
      ? newRoll
      : (state.currentDice.map((d, i) => (holds[i] ? d : newRoll[i])) as unknown as DiceRoll);

    return {
      ...state,
      status: "Scoring",
      currentDice: finalDice,
      rollCount: state.rollCount + 1,
      currentTurnRolls: [...state.currentTurnRolls, finalDice],
      pendingSurrenderOfferByPlayerId: undefined
    };
  });
};

/**
 * Checks if the score boards of all players are completely filled (12 categories each).
 */
const isGameFinished = (players: readonly PlayerState[]): boolean => {
  const totalCategories = 12;
  return players.every((p) => Object.keys(p.scoreBoard).length === totalCategories);
};

/**
 * Calculates updated player score stats including bonus.
 */
const updatePlayerState = (player: PlayerState, category: ScoreCategory, dice: DiceRoll): PlayerState => {
  const nextScoreBoard = {
    ...player.scoreBoard,
    [category]: calculateScore(category, dice)
  };

  const upperSum = calculateUpperSectionSum(nextScoreBoard);
  const nextBonus = calculateUpperBonus(upperSum);

  // Sum of all values in score board
  const scoreBoardSum = Object.values(nextScoreBoard).reduce((sum, val) => sum + (val || 0), 0);
  const nextTotalScore = scoreBoardSum + nextBonus;

  return {
    ...player,
    scoreBoard: nextScoreBoard,
    bonusScore: nextBonus,
    totalScore: nextTotalScore
  };
};

/**
 * Selects a category and records the score for the current dice roll.
 * Automatically handles turn transition or game completion.
 */
export const selectCategory = (
  state: GameState,
  category: ScoreCategory
): Effect.Effect<GameState, GameError> => {
  return Effect.gen(function* () {
    // 1. Check if game is finished
    if (state.status === "Finished") {
      yield* Effect.fail(new GameAlreadyOverError(state.gameId));
    }

    // 2. Check if player has rolled at least once
    if (state.rollCount === 0) {
      yield* Effect.fail(
        new InvalidStateActionError("Cannot select category before rolling the dice at least once.")
      );
    }

    const currentPlayer = state.players[state.currentPlayerIndex];

    // 3. Check if category is already filled
    if (currentPlayer.scoreBoard[category] !== undefined) {
      yield* Effect.fail(new CategoryAlreadyFilledError(category));
    }

    // 4. Update the active player's score state
    const updatedPlayer = updatePlayerState(currentPlayer, category, state.currentDice);
    const updatedPlayers = state.players.map((p, index) =>
      index === state.currentPlayerIndex ? updatedPlayer : p
    );

    // Create turn record
    const turnRecord = {
      playerIndex: state.currentPlayerIndex,
      playerName: currentPlayer.playerName,
      turnNumber: Object.keys(currentPlayer.scoreBoard).length + 1,
      rolls: state.currentTurnRolls,
      category,
      score: calculateScore(category, state.currentDice)
    };

    // 5. Determine next game status
    if (isGameFinished(updatedPlayers)) {
      return {
        ...state,
        players: updatedPlayers,
        status: "Finished",
        turnHistory: [...state.turnHistory, turnRecord],
        currentTurnRolls: [],
        pendingSurrenderOfferByPlayerId: undefined
      };
    }

    // 6. Transition turn
    let nextPlayerIndex = state.currentPlayerIndex;
    if (state.mode === "multi") {
      nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    }

    return {
      ...state,
      players: updatedPlayers,
      currentPlayerIndex: nextPlayerIndex,
      status: "Rolling",
      currentDice: [1, 1, 1, 1, 1], // Reset dice
      rollCount: 0, // Reset roll count
      turnHistory: [...state.turnHistory, turnRecord],
      currentTurnRolls: [],
      pendingSurrenderOfferByPlayerId: undefined
    };
  });
};

/**
 * Surrenders the game on behalf of a player, instantly finishing it.
 */
export const surrenderGame = (
  state: GameState,
  surrenderingPlayerId: string
): Effect.Effect<GameState, GameError> => {
  return Effect.gen(function* () {
    // 1. Check if game is already finished
    if (state.status === "Finished") {
      yield* Effect.fail(new GameAlreadyOverError(state.gameId));
    }

    // 2. Validate that the surrendering player is indeed in the game
    const isPlayerInGame = state.players.some((p) => p.playerId === surrenderingPlayerId);
    if (!isPlayerInGame) {
      yield* Effect.fail(new InvalidStateActionError(`Player ${surrenderingPlayerId} is not in this game.`));
    }

    // 3. Mark the game as Finished and record the surrendering player
    return {
      ...state,
      status: "Finished",
      surrenderedPlayerId: surrenderingPlayerId,
      pendingSurrenderOfferByPlayerId: undefined
    };
  });
};

/**
 * Proposes a surrender on behalf of a player.
 */
export const offerSurrender = (
  state: GameState,
  proposingPlayerId: string
): Effect.Effect<GameState, GameError> => {
  return Effect.gen(function* () {
    if (state.status === "Finished") {
      yield* Effect.fail(new GameAlreadyOverError(state.gameId));
    }

    const isPlayerInGame = state.players.some((p) => p.playerId === proposingPlayerId);
    if (!isPlayerInGame) {
      yield* Effect.fail(new InvalidStateActionError(`Player ${proposingPlayerId} is not in this game.`));
    }

    return {
      ...state,
      pendingSurrenderOfferByPlayerId: proposingPlayerId
    };
  });
};

/**
 * Accepts a pending surrender offer on behalf of the opponent player.
 */
export const acceptSurrender = (
  state: GameState,
  acceptingPlayerId: string
): Effect.Effect<GameState, GameError> => {
  return Effect.gen(function* () {
    if (state.status === "Finished") {
      yield* Effect.fail(new GameAlreadyOverError(state.gameId));
    }

    const offererId = state.pendingSurrenderOfferByPlayerId;
    if (!offererId) {
      return yield* Effect.fail(new InvalidStateActionError("No pending surrender offer to accept."));
    }

    if (acceptingPlayerId === offererId) {
      return yield* Effect.fail(new InvalidStateActionError("Proposer cannot accept their own surrender offer."));
    }

    const isPlayerInGame = state.players.some((p) => p.playerId === acceptingPlayerId);
    if (!isPlayerInGame) {
      return yield* Effect.fail(new InvalidStateActionError(`Player ${acceptingPlayerId} is not in this game.`));
    }

    return yield* surrenderGame(state, offererId);
  });
};

/**
 * Declines a pending surrender offer.
 */
export const declineSurrender = (
  state: GameState,
  decliningPlayerId: string
): Effect.Effect<GameState, GameError> => {
  return Effect.gen(function* () {
    if (state.status === "Finished") {
      yield* Effect.fail(new GameAlreadyOverError(state.gameId));
    }

    if (!state.pendingSurrenderOfferByPlayerId) {
      yield* Effect.fail(new InvalidStateActionError("No pending surrender offer to decline."));
    }

    const isPlayerInGame = state.players.some((p) => p.playerId === decliningPlayerId);
    if (!isPlayerInGame) {
      yield* Effect.fail(new InvalidStateActionError(`Player ${decliningPlayerId} is not in this game.`));
    }

    return {
      ...state,
      pendingSurrenderOfferByPlayerId: undefined
    };
  });
};


