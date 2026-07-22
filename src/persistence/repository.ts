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
  readonly elo: number;
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
  readonly surrenderedId: string | null;
  readonly playedAt: Date;
  readonly historyJson?: string | null;
  readonly player1EloAfter?: number | null;
  readonly player2EloAfter?: number | null;
}

export interface PlayerRepository {
  readonly upsertPlayer: (id: string, name: string) => Effect.Effect<void, RepositoryError>;
  readonly getPlayer: (id: string, guildId?: string | null) => Effect.Effect<Option.Option<PlayerStats>, RepositoryError>;
  readonly updateStats: (id: string, guildId: string | null, mode: "single" | "multi", outcome: "win" | "loss" | "draw", score: number) => Effect.Effect<void, RepositoryError>;
  readonly updateElo: (id: string, guildId: string | null, newElo: number) => Effect.Effect<void, RepositoryError>;
  readonly getLeaderboard: (mode: "single" | "multi", guildId: string | null, limit: number) => Effect.Effect<readonly PlayerStats[], RepositoryError>;
  readonly getAllPlayers: (guildId: string | null, limit: number) => Effect.Effect<readonly PlayerStats[], RepositoryError>;
}

export const PlayerRepository = Context.GenericTag<PlayerRepository>("@services/PlayerRepository");

export interface MatchRepository {
  readonly saveMatch: (match: MatchRecord) => Effect.Effect<void, RepositoryError>;
  readonly getRecentMatches: (playerId: string, guildId: string | null, limit: number) => Effect.Effect<readonly MatchRecord[], RepositoryError>;
  readonly getMatchById: (matchId: string) => Effect.Effect<Option.Option<MatchRecord>, RepositoryError>;
  readonly getPlayerAverageScore: (playerId: string, guildId: string | null, mode: "single" | "multi") => Effect.Effect<number, RepositoryError>;
  readonly getGlobalRecentMatches: (guildId: string | null, limit: number) => Effect.Effect<readonly MatchRecord[], RepositoryError>;
}

export const MatchRepository = Context.GenericTag<MatchRepository>("@services/MatchRepository");

export interface GameRepository {
  readonly save: (state: GameState) => Effect.Effect<void, RepositoryError>;
  readonly findById: (gameId: string) => Effect.Effect<Option.Option<GameState>, RepositoryError>;
  readonly delete: (gameId: string) => Effect.Effect<void, RepositoryError>;
  readonly findActiveGameByPlayers: (player1Id: string, player2Id: string) => Effect.Effect<Option.Option<GameState>, RepositoryError>;
}

export const GameRepository = Context.GenericTag<GameRepository>("@services/GameRepository");

export interface InvitationRepository {
  readonly save: (invitation: import("../domain/invitation").Invitation) => Effect.Effect<void, RepositoryError>;
  readonly findById: (id: string) => Effect.Effect<Option.Option<import("../domain/invitation").Invitation>, RepositoryError>;
  readonly findActiveBetweenPlayers: (p1Id: string, p2Id: string) => Effect.Effect<Option.Option<import("../domain/invitation").Invitation>, RepositoryError>;
  readonly updateStatus: (id: string, status: import("../domain/invitation").InvitationStatus) => Effect.Effect<void, RepositoryError>;
}

export const InvitationRepository = Context.GenericTag<InvitationRepository>("@services/InvitationRepository");

export interface MatchQueueRepository {
  readonly save: (queue: import("../domain/matchQueue").MatchQueue) => Effect.Effect<void, RepositoryError>;
  readonly findById: (id: string) => Effect.Effect<Option.Option<import("../domain/matchQueue").MatchQueue>, RepositoryError>;
  readonly findActiveByHost: (hostId: string, guildId: string, channelId: string) => Effect.Effect<Option.Option<import("../domain/matchQueue").MatchQueue>, RepositoryError>;
  readonly updateStatus: (id: string, status: import("../domain/matchQueue").MatchQueueStatus) => Effect.Effect<void, RepositoryError>;
}

export const MatchQueueRepository = Context.GenericTag<MatchQueueRepository>("@services/MatchQueueRepository");

