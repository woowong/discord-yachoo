import { ScoreCategory } from "./types";

export class GameAlreadyOverError extends Error {
  readonly _tag = "GameAlreadyOverError";
  constructor(readonly gameId: string) {
    super(`Game ${gameId} is already over.`);
    this.name = "GameAlreadyOverError";
  }
}

export class RollLimitExceededError extends Error {
  readonly _tag = "RollLimitExceededError";
  constructor(readonly currentRollCount: number) {
    super(`Roll limit exceeded. Current roll count: ${currentRollCount}`);
    this.name = "RollLimitExceededError";
  }
}

export class CategoryAlreadyFilledError extends Error {
  readonly _tag = "CategoryAlreadyFilledError";
  constructor(readonly category: ScoreCategory) {
    super(`Category ${category} is already filled.`);
    this.name = "CategoryAlreadyFilledError";
  }
}

export class InvalidStateActionError extends Error {
  readonly _tag = "InvalidStateActionError";
  constructor(readonly message: string) {
    super(message);
    this.name = "InvalidStateActionError";
  }
}

export class NotYourTurnError extends Error {
  readonly _tag = "NotYourTurnError";
  constructor(readonly expectedPlayerId: string, readonly actualPlayerId: string) {
    super(`It is not your turn. Expected player ID: ${expectedPlayerId}, actual: ${actualPlayerId}`);
    this.name = "NotYourTurnError";
  }
}

export type GameError =
  | GameAlreadyOverError
  | RollLimitExceededError
  | CategoryAlreadyFilledError
  | InvalidStateActionError
  | NotYourTurnError;
