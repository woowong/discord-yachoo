import { describe, it, expect, vi } from "vitest";
import { Effect, Layer, Option } from "effect";
import { D1Database, D1PreparedStatement } from "./d1/database";
import { D1PlayerRepositoryLive, D1MatchRepositoryLive } from "./d1/repository";
import { PlayerRepository, MatchRepository, MatchRecord } from "./repository";

describe("D1 Persistence Repositories", () => {
  const createMockDb = () => {
    const mockFirst = vi.fn();
    const mockRun = vi.fn();
    const mockAll = vi.fn();
    const mockBind = vi.fn();

    const mockStmt: D1PreparedStatement = {
      bind: mockBind,
      first: mockFirst,
      run: mockRun,
      all: mockAll,
      raw: vi.fn(),
    };

    mockBind.mockReturnValue(mockStmt);

    const mockBatch = vi.fn().mockResolvedValue([]);
    const mockDB: D1Database = {
      prepare: vi.fn().mockReturnValue(mockStmt),
      batch: mockBatch,
      exec: vi.fn(),
    };

    return { mockDB, mockStmt, mockFirst, mockRun, mockAll, mockBind, mockBatch };
  };

  describe("PlayerRepository", () => {
    it("upsertPlayer should execute correct SQL", async () => {
      const { mockDB, mockBind, mockRun } = createMockDb();
      mockRun.mockResolvedValue({ success: true, results: [], meta: {} });

      const program = Effect.flatMap(PlayerRepository, (repo) =>
        repo.upsertPlayer("user-123", "Alice")
      ).pipe(
        Effect.provide(D1PlayerRepositoryLive),
        Effect.provide(Layer.succeed(D1Database, mockDB))
      );

      await Effect.runPromise(program);

      expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO players"));
      expect(mockBind).toHaveBeenCalledWith("user-123", "Alice");
      expect(mockRun).toHaveBeenCalled();
    });

    it("getPlayer should return Option.some when user exists", async () => {
      const { mockDB, mockBind, mockFirst } = createMockDb();
      mockFirst.mockResolvedValue({
        id: "user-123",
        name: "Alice",
        wins: 5,
        losses: 2,
        draws: 1,
        highest_score: 180,
        solo_play_count: 3,
        solo_highest_score: 150,
        multi_wins: 2,
        multi_losses: 1,
        multi_draws: 0,
        multi_highest_score: 180,
        elo: 1000,
        created_at: "2026-07-10T12:00:00.000Z",
        updated_at: "2026-07-10T12:00:00.000Z",
      });

      const program = Effect.flatMap(PlayerRepository, (repo) =>
        repo.getPlayer("user-123", null)
      ).pipe(
        Effect.provide(D1PlayerRepositoryLive),
        Effect.provide(Layer.succeed(D1Database, mockDB))
      );

      const result = await Effect.runPromise(program);

      expect(Option.isSome(result)).toBe(true);
      const stats = Option.getOrThrow(result);
      expect(stats.id).toBe("user-123");
      expect(stats.name).toBe("Alice");
      expect(stats.wins).toBe(5);
      expect(stats.highestScore).toBe(180);
      expect(stats.soloPlayCount).toBe(3);
      expect(stats.soloHighestScore).toBe(150);
      expect(stats.multiWins).toBe(2);
      expect(stats.multiLosses).toBe(1);
      expect(stats.multiDraws).toBe(0);
      expect(stats.multiHighestScore).toBe(180);
      expect(stats.elo).toBe(1000);
      expect(mockDB.prepare).toHaveBeenCalledWith("SELECT *, COALESCE(elo, 1000) as elo FROM players WHERE id = ?");
      expect(mockBind).toHaveBeenCalledWith("user-123");
      expect(mockFirst).toHaveBeenCalled();
    });

    it("getPlayer should return Option.none when user does not exist", async () => {
      const { mockDB, mockFirst } = createMockDb();
      mockFirst.mockResolvedValue(null);

      const program = Effect.flatMap(PlayerRepository, (repo) =>
        repo.getPlayer("user-nonexistent")
      ).pipe(
        Effect.provide(D1PlayerRepositoryLive),
        Effect.provide(Layer.succeed(D1Database, mockDB))
      );

      const result = await Effect.runPromise(program);

      expect(Option.isNone(result)).toBe(true);
    });

    it("getPlayer should query with guild join when guildId is provided", async () => {
      const { mockDB, mockBind, mockFirst } = createMockDb();
      mockFirst.mockResolvedValue({
        id: "user-123",
        name: "Alice",
        wins: 5,
        losses: 2,
        draws: 1,
        highest_score: 180,
        solo_play_count: 3,
        solo_highest_score: 150,
        multi_wins: 2,
        multi_losses: 1,
        multi_draws: 0,
        multi_highest_score: 180,
        elo: 1000,
        created_at: "2026-07-10T12:00:00.000Z",
        updated_at: "2026-07-10T12:00:00.000Z",
      });

      const program = Effect.flatMap(PlayerRepository, (repo) =>
        repo.getPlayer("user-123", "guild-456")
      ).pipe(
        Effect.provide(D1PlayerRepositoryLive),
        Effect.provide(Layer.succeed(D1Database, mockDB))
      );

      await Effect.runPromise(program);

      expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining("LEFT JOIN guild_player_stats"));
      expect(mockBind).toHaveBeenCalledWith("guild-456", "user-123");
      expect(mockFirst).toHaveBeenCalled();
    });

    it("updateStats should execute correct update SQL for single mode", async () => {
      const { mockDB, mockBind, mockBatch } = createMockDb();

      const program = Effect.flatMap(PlayerRepository, (repo) =>
        repo.updateStats("user-123", "guild-456", "single", "win", 120)
      ).pipe(
        Effect.provide(D1PlayerRepositoryLive),
        Effect.provide(Layer.succeed(D1Database, mockDB))
      );

      await Effect.runPromise(program);

      expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO guild_player_stats"));
      expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining("UPDATE players"));
      expect(mockBind).toHaveBeenCalledWith("user-123", "guild-456", 120, 120);
      expect(mockBatch).toHaveBeenCalled();
    });

    it("updateStats should execute correct update SQL for multi mode", async () => {
      const { mockDB, mockBind, mockBatch } = createMockDb();

      const program = Effect.flatMap(PlayerRepository, (repo) =>
        repo.updateStats("user-123", "guild-456", "multi", "win", 120)
      ).pipe(
        Effect.provide(D1PlayerRepositoryLive),
        Effect.provide(Layer.succeed(D1Database, mockDB))
      );

      await Effect.runPromise(program);

      expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO guild_player_stats"));
      expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining("UPDATE players"));
      expect(mockBind).toHaveBeenCalledWith("user-123", "guild-456", 1, 0, 0, 120, 1, 0, 0, 120);
      expect(mockBatch).toHaveBeenCalled();
    });

    it("getLeaderboard should query solo players ordered by score", async () => {
      const { mockDB, mockBind, mockAll } = createMockDb();
      mockAll.mockResolvedValue({
        success: true,
        results: [
          {
            id: "user-1",
            name: "Alice",
            wins: 10,
            losses: 0,
            draws: 0,
            highest_score: 300,
            solo_play_count: 5,
            solo_highest_score: 250,
            multi_wins: 5,
            multi_losses: 0,
            multi_draws: 0,
            multi_highest_score: 300,
            created_at: "2026-07-10T12:00:00.000Z",
            updated_at: "2026-07-10T12:00:00.000Z",
          },
        ],
        meta: {},
      });

      const program = Effect.flatMap(PlayerRepository, (repo) =>
        repo.getLeaderboard("single", "guild-456", 5)
      ).pipe(
        Effect.provide(D1PlayerRepositoryLive),
        Effect.provide(Layer.succeed(D1Database, mockDB))
      );

      const list = await Effect.runPromise(program);

      expect(list).toHaveLength(1);
      expect(list[0].id).toBe("user-1");
      expect(list[0].soloHighestScore).toBe(250);
      expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining("FROM guild_player_stats"));
      expect(mockBind).toHaveBeenCalledWith("guild-456", 5);
    });

    it("getLeaderboard should query matching players ordered by wins", async () => {
      const { mockDB, mockBind, mockAll } = createMockDb();
      mockAll.mockResolvedValue({
        success: true,
        results: [
          {
            id: "user-1",
            name: "Alice",
            wins: 10,
            losses: 0,
            draws: 0,
            highest_score: 300,
            solo_play_count: 5,
            solo_highest_score: 250,
            multi_wins: 5,
            multi_losses: 0,
            multi_draws: 0,
            multi_highest_score: 300,
            created_at: "2026-07-10T12:00:00.000Z",
            updated_at: "2026-07-10T12:00:00.000Z",
          },
        ],
        meta: {},
      });

      const program = Effect.flatMap(PlayerRepository, (repo) =>
        repo.getLeaderboard("multi", "guild-456", 5)
      ).pipe(
        Effect.provide(D1PlayerRepositoryLive),
        Effect.provide(Layer.succeed(D1Database, mockDB))
      );

      const list = await Effect.runPromise(program);

      expect(list).toHaveLength(1);
      expect(list[0].id).toBe("user-1");
      expect(list[0].multiWins).toBe(5);
      expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining("FROM guild_player_stats"));
      expect(mockBind).toHaveBeenCalledWith("guild-456", 5);
    });
  });

  describe("MatchRepository", () => {
    it("saveMatch should insert record", async () => {
      const { mockDB, mockBind, mockRun } = createMockDb();
      mockRun.mockResolvedValue({ success: true, results: [], meta: {} });

      const match: MatchRecord = {
        id: "match-123",
        mode: "single",
        guildId: "guild-456",
        player1Id: "user-123",
        player2Id: null,
        player1Score: 150,
        player2Score: null,
        winnerId: null,
        surrenderedId: null,
        playedAt: new Date("2026-07-10T12:00:00.000Z"),
        historyJson: JSON.stringify([{ round: 1 }])
      };

      const program = Effect.flatMap(MatchRepository, (repo) =>
        repo.saveMatch(match)
      ).pipe(
        Effect.provide(D1MatchRepositoryLive),
        Effect.provide(Layer.succeed(D1Database, mockDB))
      );

      await Effect.runPromise(program);

      expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO matches"));
      expect(mockBind).toHaveBeenCalledWith(
        "match-123",
        "single",
        "guild-456",
        "user-123",
        null,
        150,
        null,
        null,
        null, // surrenderedId
        "2026-07-10T12:00:00.000Z",
        JSON.stringify([{ round: 1 }])
      );
      expect(mockRun).toHaveBeenCalled();
    });

    it("getRecentMatches should query player's match history", async () => {
      const { mockDB, mockBind, mockAll } = createMockDb();
      mockAll.mockResolvedValue({
        success: true,
        results: [
          {
            id: "match-123",
            mode: "single",
            guild_id: "guild-456",
            player1_id: "user-123",
            player2_id: null,
            player1_score: 150,
            player2_score: null,
            winner_id: null,
            played_at: "2026-07-10T12:00:00.000Z",
            history_json: null
          },
        ],
        meta: {},
      });

      const program = Effect.flatMap(MatchRepository, (repo) =>
        repo.getRecentMatches("user-123", "guild-456", 10)
      ).pipe(
        Effect.provide(D1MatchRepositoryLive),
        Effect.provide(Layer.succeed(D1Database, mockDB))
      );

      const history = await Effect.runPromise(program);

      expect(history).toHaveLength(1);
      expect(history[0].id).toBe("match-123");
      expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining("guild_id = ?"));
      expect(mockBind).toHaveBeenCalledWith("user-123", "user-123", "guild-456", 10);
    });

    it("getMatchById should retrieve match record by ID", async () => {
      const { mockDB, mockBind, mockFirst } = createMockDb();
      mockFirst.mockResolvedValue({
        id: "match-123",
        mode: "single",
        player1_id: "user-123",
        player2_id: null,
        player1_score: 150,
        player2_score: null,
        winner_id: null,
        played_at: "2026-07-10T12:00:00.000Z",
        history_json: JSON.stringify([{ round: 1 }])
      });

      const program = Effect.flatMap(MatchRepository, (repo) =>
        repo.getMatchById("match-123")
      ).pipe(
        Effect.provide(D1MatchRepositoryLive),
        Effect.provide(Layer.succeed(D1Database, mockDB))
      );

      const result = await Effect.runPromise(program);

      expect(Option.isSome(result)).toBe(true);
      const match = Option.getOrThrow(result);
      expect(match.id).toBe("match-123");
      expect(match.historyJson).toBe(JSON.stringify([{ round: 1 }]));
      expect(mockDB.prepare).toHaveBeenCalledWith("SELECT * FROM matches WHERE id = ?");
      expect(mockBind).toHaveBeenCalledWith("match-123");
      expect(mockFirst).toHaveBeenCalled();
    });
  });
});
