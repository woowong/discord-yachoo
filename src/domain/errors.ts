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

export class AllDiceHeldError extends Error {
  readonly _tag = "AllDiceHeldError";
  constructor() {
    super("Cannot roll when all dice are held.");
    this.name = "AllDiceHeldError";
  }
}

export type GameError =
  | GameAlreadyOverError
  | RollLimitExceededError
  | CategoryAlreadyFilledError
  | InvalidStateActionError
  | NotYourTurnError
  | AllDiceHeldError;

export class ActiveInvitationExistsError extends Error {
  readonly _tag = "ActiveInvitationExistsError";
  constructor() {
    super("이미 진행 중인 초대가 있습니다.");
    this.name = "ActiveInvitationExistsError";
  }
}

export class InvitationNotFoundError extends Error {
  readonly _tag = "InvitationNotFoundError";
  constructor() {
    super("초대를 찾을 수 없거나 이미 처리되었습니다.");
    this.name = "InvitationNotFoundError";
  }
}

export class InvitationExpiredError extends Error {
  readonly _tag = "InvitationExpiredError";
  constructor() {
    super("초대 유효시간(5분)이 만료되었습니다.");
    this.name = "InvitationExpiredError";
  }
}

export class UnauthorizedInvitationError extends Error {
  readonly _tag = "UnauthorizedInvitationError";
  constructor() {
    super("지정된 상대방만 초대를 수락/거절할 수 있습니다.");
    this.name = "UnauthorizedInvitationError";
  }
}

export class ActiveMatchQueueExistsError extends Error {
  readonly _tag = "ActiveMatchQueueExistsError";
  constructor() {
    super("이미 생성한 대기열 방이 있습니다.");
    this.name = "ActiveMatchQueueExistsError";
  }
}

export class MatchQueueNotFoundError extends Error {
  readonly _tag = "MatchQueueNotFoundError";
  constructor() {
    super("대기열 방을 찾을 수 없거나 이미 참가했습니다.");
    this.name = "MatchQueueNotFoundError";
  }
}

export class MatchQueueExpiredError extends Error {
  readonly _tag = "MatchQueueExpiredError";
  constructor() {
    super("대기열 유효시간(5분)이 만료되었습니다.");
    this.name = "MatchQueueExpiredError";
  }
}

export class SelfJoinQueueError extends Error {
  readonly _tag = "SelfJoinQueueError";
  constructor() {
    super("자신이 만든 대기열 방에는 참가할 수 없습니다.");
    this.name = "SelfJoinQueueError";
  }
}

export class UnauthorizedCancelQueueError extends Error {
  readonly _tag = "UnauthorizedCancelQueueError";
  constructor() {
    super("방장만 대기열을 취소할 수 있습니다.");
    this.name = "UnauthorizedCancelQueueError";
  }
}

