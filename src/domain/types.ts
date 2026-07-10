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
  readonly bonusScore: number; // 35 if upper section >= 63, otherwise 0
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
