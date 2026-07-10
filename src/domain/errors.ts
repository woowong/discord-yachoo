import { ScoreCategory } from "./types";

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

export class NotYourTurnError {
  readonly _tag = "NotYourTurnError";
  constructor(readonly expectedPlayerId: string, readonly actualPlayerId: string) {}
}

export type GameError =
  | GameAlreadyOverError
  | RollLimitExceededError
  | CategoryAlreadyFilledError
  | InvalidStateActionError
  | NotYourTurnError;
