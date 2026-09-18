import { describe, it, expect, vi } from "vitest";
import { Effect, Layer, Option } from "effect";
import { GameWorkflowService, GameWorkflowServiceLive } from "./GameWorkflowService";
import { ColosseumRepository, PlayerRepository, GameRepository, MatchRepository, InvitationRepository, MatchQueueRepository } from "../persistence/repository";
import { InMemoryColosseumRepositoryLive, InMemoryRepositoryLive, InMemoryInvitationRepositoryLive } from "../persistence/memory/repository";
import { DiscordResponseSerializer, DiscordResponseSerializerLive } from "../presentation/discord/adapter/serializer";
import { DiscordApiService, FlyBrainUrl } from "../presentation/discord/adapter/api";

describe("Colosseum Workflow Service", () => {
  const mockPlayerRepo = {
    upsertPlayer: vi.fn().mockReturnValue(Effect.void),
    getPlayer: vi.fn().mockImplementation((id: string) =>
      Effect.succeed(
        Option.some({
          id,
          name: "TestUser",
          elo: 1200,
          wins: 0,
          losses: 0,
          draws: 0,
          highestScore: 0,
          soloPlayCount: 0,
          soloHighestScore: 0,
          multiWins: 0,
          multiLosses: 0,
          multiDraws: 0,
          multiHighestScore: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      )
    ),
    updateElo: vi.fn().mockReturnValue(Effect.void),
    updateStats: vi.fn().mockReturnValue(Effect.void),
    getLeaderboard: vi.fn().mockReturnValue(Effect.succeed([])),
    getAllPlayers: vi.fn().mockReturnValue(Effect.succeed([]))
  };

  const mockApiService = {
    editMessage: vi.fn().mockReturnValue(Effect.void),
    sendMessage: vi.fn().mockReturnValue(Effect.void),
    deleteMessage: vi.fn().mockReturnValue(Effect.void)
  };

  const testLayer = Layer.mergeAll(
    GameWorkflowServiceLive,
    InMemoryColosseumRepositoryLive,
    InMemoryRepositoryLive,
    InMemoryInvitationRepositoryLive,
    DiscordResponseSerializerLive,
    Layer.succeed(PlayerRepository, mockPlayerRepo as any),
    Layer.succeed(MatchRepository, {} as any),
    Layer.succeed(MatchQueueRepository, {} as any),
    Layer.succeed(DiscordApiService, mockApiService as any),
    Layer.succeed(FlyBrainUrl, "http://mock-fly")
  );

  it("should create a colosseum match with odds and betting status", async () => {
    const program = Effect.gen(function* () {
      const workflow = yield* GameWorkflowService;
      return yield* workflow.createColosseumMatch("guild-1", "chan-1");
    }).pipe(Effect.provide(testLayer));

    const match = await Effect.runPromise(program);
    expect(match.id).toContain("colosseum_");
    expect(match.status).toBe("BETTING");
    expect(match.oddsA).toBeGreaterThan(1.0);
    expect(match.oddsB).toBeGreaterThan(1.0);
    expect(match.personaAId).not.toBe(match.personaBId);
  });

  it("should place bet and deduct user Elo", async () => {
    const program = Effect.gen(function* () {
      const workflow = yield* GameWorkflowService;
      const match = yield* workflow.createColosseumMatch("guild-1", "chan-1");
      const betResult = yield* workflow.placeColosseumBet(
        match.id,
        "user-1",
        "Alice",
        "guild-1",
        "A",
        20
      );
      return { match, betResult };
    }).pipe(Effect.provide(testLayer));

    const { match, betResult } = await Effect.runPromise(program);
    expect(betResult.bet.amount).toBe(20);
    expect(betResult.bet.chosenPersona).toBe("A");
    expect(betResult.allBets).toHaveLength(1);
    expect(mockPlayerRepo.updateElo).toHaveBeenCalledWith("user-1", "guild-1", 1180);
  });

  it("should reject bet if user already placed bet in the same match", async () => {
    const program = Effect.gen(function* () {
      const workflow = yield* GameWorkflowService;
      const match = yield* workflow.createColosseumMatch("guild-1", "chan-1");
      yield* workflow.placeColosseumBet(match.id, "user-2", "Bob", "guild-1", "A", 20);
      return yield* workflow.placeColosseumBet(match.id, "user-2", "Bob", "guild-1", "B", 20);
    }).pipe(
      Effect.catchTag("ColosseumAlreadyBetError", (err) => Effect.succeed("ALREADY_BET")),
      Effect.provide(testLayer)
    );

    const result = await Effect.runPromise(program);
    expect(result).toBe("ALREADY_BET");
  });

  it("should start duel and dispatch background execution", async () => {
    const waitCalls: Promise<any>[] = [];
    const mockCtx = {
      waitUntil: (p: Promise<any>) => {
        waitCalls.push(p);
      }
    };

    const program = Effect.gen(function* () {
      const workflow = yield* GameWorkflowService;
      const match = yield* workflow.createColosseumMatch("guild-1", "chan-1");
      yield* workflow.placeColosseumBet(match.id, "user-1", "Alice", "guild-1", "A", 20);
      const updated = yield* workflow.startColosseumDuel(match.id, "chan-1", "msg-123", mockCtx);
      return { match, updated };
    }).pipe(Effect.provide(testLayer));

    const { updated } = await Effect.runPromise(program);
    expect(updated.status).toBe("SIMULATING");
    expect(waitCalls.length).toBe(1);
  });

  it("should execute colosseum duel lifecycle and payout winners", async () => {
    // Mock global fetch for python duel API
    const mockDuelResponse = {
      winner: "A",
      score_a: 180,
      score_b: 150,
      persona_a: "Jackpot",
      persona_b: "Newton",
      diff: 30,
      lead_changes: 0,
      rounds: [
        {
          round: 6,
          a: { category: "Choice", points: 20, total: 90, dopamine: 120, dialogue: "Boom!", dice: [5, 5, 4, 3, 3] },
          b: { category: "Choice", points: 18, total: 70, dopamine: 110, dialogue: "Hmm...", dice: [4, 4, 4, 3, 2] },
          leader: "A",
          is_lead_change: false
        },
        {
          round: 12,
          a: { category: "Choice", points: 20, total: 180, dopamine: 140, dialogue: "Jackpot!", dice: [6, 6, 6, 6, 6] },
          b: { category: "Choice", points: 18, total: 150, dopamine: 100, dialogue: "Calculated...", dice: [5, 5, 5, 5, 2] },
          leader: "A",
          is_lead_change: false
        }
      ]
    };

    const testApiService = {
      editMessage: vi.fn().mockReturnValue(Effect.void),
      sendMessage: vi.fn().mockReturnValue(Effect.void),
      deleteMessage: vi.fn().mockReturnValue(Effect.void)
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockDuelResponse
    } as any);

    try {
      const program = Effect.gen(function* () {
        const workflow = yield* GameWorkflowService;
        const match = yield* workflow.createColosseumMatch("guild-1", "chan-1");
        // User 1 bets 20 on A
        yield* workflow.placeColosseumBet(match.id, "user-1", "Alice", "guild-1", "A", 20);
        // User 2 bets 30 on B
        yield* workflow.placeColosseumBet(match.id, "user-2", "Bob", "guild-1", "B", 30);

        // Execute duel directly
        yield* workflow.executeColosseumMatch(match.id, "chan-1", "msg-123");

        const colosseumRepo = yield* ColosseumRepository;
        const finalMatch = yield* colosseumRepo.getMatchById(match.id);
        const finalBets = yield* colosseumRepo.getBetsByMatchId(match.id);
        return { finalMatch, finalBets };
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            testLayer,
            Layer.succeed(DiscordApiService, testApiService as any)
          )
        )
      );

      const { finalMatch, finalBets } = await Effect.runPromise(program);
      expect(Option.isSome(finalMatch)).toBe(true);
      if (Option.isSome(finalMatch)) {
        expect(finalMatch.value.status).toBe("COMPLETED");
        expect(finalMatch.value.winner).toBe("A");
        expect(finalMatch.value.scoreA).toBe(180);
        expect(finalMatch.value.scoreB).toBe(150);
      }

      // Alice won on A, Bob lost on B
      const aliceBet = finalBets.find((b) => b.userId === "user-1");
      const bobBet = finalBets.find((b) => b.userId === "user-2");
      expect(aliceBet?.status).toBe("WON");
      expect(aliceBet?.payout).toBeGreaterThan(aliceBet?.amount ?? 0);
      expect(bobBet?.status).toBe("LOST");
      expect(bobBet?.payout).toBe(0);

      // Verify Discord messages were edited (1 opening + 12 rounds + 1 final result = 14 stages)
      expect(testApiService.editMessage).toHaveBeenCalledTimes(14);
    } finally {
      globalThis.fetch = originalFetch;
    }
  }, 35000);
});
