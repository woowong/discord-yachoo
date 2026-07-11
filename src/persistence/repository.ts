import { Effect, Context, Option } from "effect";
import { GameState } from "../domain/types";

export class RepositoryError {
  readonly _tag = "RepositoryError";
  constructor(readonly message: string, readonly cause?: unknown) {}
}

export interface PlayerStats {
  readonly id: string;
  readonly name: string;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly highestScore: number;
  readonly soloPlayCount: number;
  readonly soloHighestScore: number;
  readonly multiWins: number;
  readonly multiLosses: number;
  readonly multiDraws: number;
  readonly multiHighestScore: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface MatchRecord {
  readonly id: string;
  readonly mode: "single" | "multi";
  readonly guildId: string | null;
  readonly player1Id: string;
  readonly player2Id: string | null;
  readonly player1Score: number;
  readonly player2Score: number | null;
  readonly winnerId: string | null;
  readonly playedAt: Date;
  readonly historyJson?: string | null;
}

export interface PlayerRepository {
  readonly upsertPlayer: (id: string, name: string) => Effect.Effect<void, RepositoryError>;
  readonly getPlayer: (id: string, guildId?: string | null) => Effect.Effect<Option.Option<PlayerStats>, RepositoryError>;
  readonly updateStats: (id: string, guildId: string | null, mode: "single" | "multi", outcome: "win" | "loss" | "draw", score: number) => Effect.Effect<void, RepositoryError>;
  readonly getLeaderboard: (mode: "single" | "multi", guildId: string | null, limit: number) => Effect.Effect<readonly PlayerStats[], RepositoryError>;
}

export const PlayerRepository = Context.GenericTag<PlayerRepository>("@services/PlayerRepository");

export interface MatchRepository {
  readonly saveMatch: (match: MatchRecord) => Effect.Effect<void, RepositoryError>;
  readonly getRecentMatches: (playerId: string, guildId: string | null, limit: number) => Effect.Effect<readonly MatchRecord[], RepositoryError>;
  readonly getMatchById: (matchId: string) => Effect.Effect<Option.Option<MatchRecord>, RepositoryError>;
}

export const MatchRepository = Context.GenericTag<MatchRepository>("@services/MatchRepository");

export interface GameRepository {
  readonly save: (state: GameState) => Effect.Effect<void, RepositoryError>;
  readonly findById: (gameId: string) => Effect.Effect<Option.Option<GameState>, RepositoryError>;
}

export const GameRepository = Context.GenericTag<GameRepository>("@services/GameRepository");
