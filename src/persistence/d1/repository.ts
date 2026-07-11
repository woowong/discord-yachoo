import { Effect, Layer, Option } from "effect";
import { PlayerRepository, MatchRepository, GameRepository, PlayerStats, MatchRecord, RepositoryError } from "../repository";
import { D1Database } from "./database";
import { GameState } from "../../domain/types";

// DB Row interfaces
interface DBPlayerRow {
  readonly id: string;
  readonly name: string;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly highest_score: number;
  readonly created_at: string;
  readonly updated_at: string;
}

interface DBMatchRow {
  readonly id: string;
  readonly mode: string;
  readonly player1_id: string;
  readonly player2_id: string | null;
  readonly player1_score: number;
  readonly player2_score: number | null;
  readonly winner_id: string | null;
  readonly played_at: string;
  readonly history_json: string | null;
}

const mapRowToPlayerStats = (row: DBPlayerRow): PlayerStats => ({
  id: row.id,
  name: row.name,
  wins: row.wins,
  losses: row.losses,
  draws: row.draws,
  highestScore: row.highest_score,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

const mapRowToMatchRecord = (row: DBMatchRow): MatchRecord => ({
  id: row.id,
  mode: row.mode as "single" | "multi",
  player1Id: row.player1_id,
  player2Id: row.player2_id,
  player1Score: row.player1_score,
  player2Score: row.player2_score,
  winnerId: row.winner_id,
  playedAt: new Date(row.played_at),
  historyJson: row.history_json || null,
});

export const D1PlayerRepositoryLive = Layer.effect(
  PlayerRepository,
  Effect.gen(function* () {
    const db = yield* D1Database;

    return {
      upsertPlayer: (id: string, name: string) =>
        Effect.tryPromise({
          try: () =>
            db.prepare(`
              INSERT INTO players (id, name, updated_at)
              VALUES (?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(id) DO UPDATE SET name = excluded.name, updated_at = CURRENT_TIMESTAMP
            `).bind(id, name).run(),
          catch: (error) => new RepositoryError(`upsertPlayer failed: ${error}`, error)
        }).pipe(Effect.asVoid),

      getPlayer: (id: string) =>
        Effect.tryPromise({
          try: () =>
            db.prepare("SELECT * FROM players WHERE id = ?").bind(id).first<DBPlayerRow>(),
          catch: (error) => new RepositoryError(`getPlayer failed: ${error}`, error)
        }).pipe(
          Effect.map((row) => (row ? Option.some(mapRowToPlayerStats(row)) : Option.none()))
        ),

      updateStats: (id: string, outcome: "win" | "loss" | "draw", score: number) =>
        Effect.tryPromise({
          try: () => {
            const winVal = outcome === "win" ? 1 : 0;
            const lossVal = outcome === "loss" ? 1 : 0;
            const drawVal = outcome === "draw" ? 1 : 0;

            return db.prepare(`
              UPDATE players
              SET wins = wins + ?,
                  losses = losses + ?,
                  draws = draws + ?,
                  highest_score = MAX(highest_score, ?),
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).bind(winVal, lossVal, drawVal, score, id).run();
          },
          catch: (error) => new RepositoryError(`updateStats failed: ${error}`, error)
        }).pipe(Effect.asVoid),

      getLeaderboard: (limit: number) =>
        Effect.tryPromise({
          try: () =>
            db.prepare("SELECT * FROM players ORDER BY highest_score DESC LIMIT ?").bind(limit).all<DBPlayerRow>(),
          catch: (error) => new RepositoryError(`getLeaderboard failed: ${error}`, error)
        }).pipe(
          Effect.map((res) => res.results.map(mapRowToPlayerStats))
        )
    };
  })
);

export const D1MatchRepositoryLive = Layer.effect(
  MatchRepository,
  Effect.gen(function* () {
    const db = yield* D1Database;

    return {
      saveMatch: (match: MatchRecord) =>
        Effect.tryPromise({
          try: () =>
            db.prepare(`
              INSERT INTO matches (id, mode, player1_id, player2_id, player1_score, player2_score, winner_id, played_at, history_json)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              match.id,
              match.mode,
              match.player1Id,
              match.player2Id,
              match.player1Score,
              match.player2Score,
              match.winnerId,
              match.playedAt ? match.playedAt.toISOString() : new Date().toISOString(),
              match.historyJson || null
            ).run(),
          catch: (error) => new RepositoryError(`saveMatch failed: ${error}`, error)
        }).pipe(Effect.asVoid),

      getRecentMatches: (playerId: string, limit: number) =>
        Effect.tryPromise({
          try: () =>
            db.prepare(`
              SELECT * FROM matches
              WHERE player1_id = ? OR player2_id = ?
              ORDER BY played_at DESC
              LIMIT ?
            `).bind(playerId, playerId, limit).all<DBMatchRow>(),
          catch: (error) => new RepositoryError(`getRecentMatches failed: ${error}`, error)
        }).pipe(
          Effect.map((res) => res.results.map(mapRowToMatchRecord))
        ),

      getMatchById: (matchId: string) =>
        Effect.tryPromise({
          try: () =>
            db.prepare("SELECT * FROM matches WHERE id = ?").bind(matchId).first<DBMatchRow>(),
          catch: (error) => new RepositoryError(`getMatchById failed: ${error}`, error)
        }).pipe(
          Effect.map((row) => (row ? Option.some(mapRowToMatchRecord(row)) : Option.none()))
        )
    };
  })
);

export const D1GameRepositoryLive = Layer.effect(
  GameRepository,
  Effect.gen(function* () {
    const db = yield* D1Database;

    return {
      save: (state: GameState) =>
        Effect.tryPromise({
          try: () =>
            db.prepare(`
              INSERT INTO active_games (id, state, updated_at)
              VALUES (?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(id) DO UPDATE SET state = excluded.state, updated_at = CURRENT_TIMESTAMP
            `).bind(state.gameId, JSON.stringify(state)).run(),
          catch: (error) => new RepositoryError(`save game failed: ${error}`, error)
        }).pipe(Effect.asVoid),

      findById: (gameId: string) =>
        Effect.tryPromise({
          try: () =>
            db.prepare("SELECT * FROM active_games WHERE id = ?").bind(gameId).first<{ state: string }>(),
          catch: (error) => new RepositoryError(`findById game failed: ${error}`, error)
        }).pipe(
          Effect.flatMap((row) =>
            row
              ? Effect.try({
                  try: () => Option.some(JSON.parse(row.state) as GameState),
                  catch: (error) => new RepositoryError(`failed to parse game state JSON: ${error}`, error)
                })
              : Effect.succeed(Option.none())
          )
        )
    };
  })
);
