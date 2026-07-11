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
  readonly solo_play_count: number;
  readonly solo_highest_score: number;
  readonly multi_wins: number;
  readonly multi_losses: number;
  readonly multi_draws: number;
  readonly multi_highest_score: number;
  readonly created_at: string;
  readonly updated_at: string;
}

interface DBMatchRow {
  readonly id: string;
  readonly mode: string;
  readonly guild_id: string | null;
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
  soloPlayCount: row.solo_play_count,
  soloHighestScore: row.solo_highest_score,
  multiWins: row.multi_wins,
  multiLosses: row.multi_losses,
  multiDraws: row.multi_draws,
  multiHighestScore: row.multi_highest_score,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

const mapRowToMatchRecord = (row: DBMatchRow): MatchRecord => ({
  id: row.id,
  mode: row.mode as "single" | "multi",
  guildId: row.guild_id || null,
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

      getPlayer: (id: string, guildId?: string | null) =>
        Effect.tryPromise({
          try: () => {
            if (guildId) {
              return db.prepare(`
                SELECT 
                  p.id, 
                  p.name, 
                  p.created_at, 
                  p.updated_at,
                  COALESCE(g.wins, 0) as wins,
                  COALESCE(g.losses, 0) as losses,
                  COALESCE(g.draws, 0) as draws,
                  COALESCE(g.highest_score, 0) as highest_score,
                  COALESCE(g.solo_play_count, 0) as solo_play_count,
                  COALESCE(g.solo_highest_score, 0) as solo_highest_score,
                  COALESCE(g.multi_wins, 0) as multi_wins,
                  COALESCE(g.multi_losses, 0) as multi_losses,
                  COALESCE(g.multi_draws, 0) as multi_draws,
                  COALESCE(g.multi_highest_score, 0) as multi_highest_score
                FROM players p
                LEFT JOIN guild_player_stats g ON p.id = g.player_id AND g.guild_id = ?
                WHERE p.id = ?
              `).bind(guildId, id).first<DBPlayerRow>();
            } else {
              return db.prepare("SELECT * FROM players WHERE id = ?").bind(id).first<DBPlayerRow>();
            }
          },
          catch: (error) => new RepositoryError(`getPlayer failed: ${error}`, error)
        }).pipe(
          Effect.map((row) => (row ? Option.some(mapRowToPlayerStats(row)) : Option.none()))
        ),

      updateStats: (id: string, guildId: string | null, mode: "single" | "multi", outcome: "win" | "loss" | "draw", score: number) =>
        Effect.tryPromise({
          try: () => {
            const winVal = outcome === "win" ? 1 : 0;
            const lossVal = outcome === "loss" ? 1 : 0;
            const drawVal = outcome === "draw" ? 1 : 0;

            const stmts = [];

            // 1. Update/Upsert guild-specific stats
            if (guildId) {
              if (mode === "single") {
                stmts.push(
                  db.prepare(`
                    INSERT INTO guild_player_stats (
                      player_id, guild_id, wins, highest_score, solo_play_count, solo_highest_score, updated_at
                    ) VALUES (?, ?, 1, ?, 1, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(player_id, guild_id) DO UPDATE SET
                      wins = wins + 1,
                      highest_score = MAX(highest_score, excluded.highest_score),
                      solo_play_count = solo_play_count + 1,
                      solo_highest_score = MAX(solo_highest_score, excluded.solo_highest_score),
                      updated_at = CURRENT_TIMESTAMP
                  `).bind(id, guildId, score, score)
                );
              } else {
                stmts.push(
                  db.prepare(`
                    INSERT INTO guild_player_stats (
                      player_id, guild_id, wins, losses, draws, highest_score, multi_wins, multi_losses, multi_draws, multi_highest_score, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(player_id, guild_id) DO UPDATE SET
                      wins = wins + excluded.wins,
                      losses = losses + excluded.losses,
                      draws = draws + excluded.draws,
                      highest_score = MAX(highest_score, excluded.highest_score),
                      multi_wins = multi_wins + excluded.multi_wins,
                      multi_losses = multi_losses + excluded.multi_losses,
                      multi_draws = multi_draws + excluded.multi_draws,
                      multi_highest_score = MAX(multi_highest_score, excluded.multi_highest_score),
                      updated_at = CURRENT_TIMESTAMP
                  `).bind(id, guildId, winVal, lossVal, drawVal, score, winVal, lossVal, drawVal, score)
                );
              }
            }

            // 2. Update legacy global stats
            if (mode === "single") {
              stmts.push(
                db.prepare(`
                  UPDATE players
                  SET wins = wins + 1,
                      highest_score = MAX(highest_score, ?),
                      solo_play_count = solo_play_count + 1,
                      solo_highest_score = MAX(solo_highest_score, ?),
                      updated_at = CURRENT_TIMESTAMP
                  WHERE id = ?
                `).bind(score, score, id)
              );
            } else {
              stmts.push(
                db.prepare(`
                  UPDATE players
                  SET wins = wins + ?,
                      losses = losses + ?,
                      draws = draws + ?,
                      highest_score = MAX(highest_score, ?),
                      multi_wins = multi_wins + ?,
                      multi_losses = multi_losses + ?,
                      multi_draws = multi_draws + ?,
                      multi_highest_score = MAX(multi_highest_score, ?),
                      updated_at = CURRENT_TIMESTAMP
                  WHERE id = ?
                `).bind(winVal, lossVal, drawVal, score, winVal, lossVal, drawVal, score, id)
              );
            }

            return db.batch(stmts);
          },
          catch: (error) => new RepositoryError(`updateStats failed: ${error}`, error)
        }).pipe(Effect.asVoid),

      getLeaderboard: (mode: "single" | "multi", guildId: string | null, limit: number) =>
        Effect.tryPromise({
          try: () => {
            if (guildId) {
              const query = mode === "single"
                ? `
                  SELECT 
                    p.id, p.name, p.created_at, g.updated_at,
                    g.wins, g.losses, g.draws, g.highest_score,
                    g.solo_play_count, g.solo_highest_score,
                    g.multi_wins, g.multi_losses, g.multi_draws, g.multi_highest_score
                  FROM guild_player_stats g
                  JOIN players p ON g.player_id = p.id
                  WHERE g.guild_id = ?
                  ORDER BY g.solo_highest_score DESC
                  LIMIT ?
                `
                : `
                  SELECT 
                    p.id, p.name, p.created_at, g.updated_at,
                    g.wins, g.losses, g.draws, g.highest_score,
                    g.solo_play_count, g.solo_highest_score,
                    g.multi_wins, g.multi_losses, g.multi_draws, g.multi_highest_score
                  FROM guild_player_stats g
                  JOIN players p ON g.player_id = p.id
                  WHERE g.guild_id = ?
                  ORDER BY g.multi_wins DESC, g.multi_highest_score DESC
                  LIMIT ?
                `;
              return db.prepare(query).bind(guildId, limit).all<DBPlayerRow>();
            } else {
              const query = mode === "single"
                ? "SELECT * FROM players ORDER BY solo_highest_score DESC LIMIT ?"
                : "SELECT * FROM players ORDER BY multi_wins DESC, multi_highest_score DESC LIMIT ?";
              return db.prepare(query).bind(limit).all<DBPlayerRow>();
            }
          },
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
              INSERT INTO matches (id, mode, guild_id, player1_id, player2_id, player1_score, player2_score, winner_id, played_at, history_json)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              match.id,
              match.mode,
              match.guildId,
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

      getRecentMatches: (playerId: string, guildId: string | null, limit: number) =>
        Effect.tryPromise({
          try: () => {
            if (guildId) {
              return db.prepare(`
                SELECT * FROM matches
                WHERE (player1_id = ? OR player2_id = ?) AND guild_id = ?
                ORDER BY played_at DESC
                LIMIT ?
              `).bind(playerId, playerId, guildId, limit).all<DBMatchRow>();
            } else {
              return db.prepare(`
                SELECT * FROM matches
                WHERE (player1_id = ? OR player2_id = ?) AND guild_id IS NULL
                ORDER BY played_at DESC
                LIMIT ?
              `).bind(playerId, playerId, limit).all<DBMatchRow>();
            }
          },
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
