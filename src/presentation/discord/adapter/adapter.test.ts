import { describe, it, expect } from "vitest";
import { Effect, Option } from "effect";
import { DiscordSignatureVerifier, DiscordSignatureVerifierLive } from "./signature";
import { DiscordInteractionParser, DiscordInteractionParserLive } from "./parser";
import { DiscordResponseSerializer, DiscordResponseSerializerLive } from "./serializer";
import { GameState } from "../../../domain/types";
import { MatchRecord, PlayerStats } from "../../../persistence/repository";

describe("Discord Webhook Adapter Layer", () => {
  describe("DiscordSignatureVerifier", () => {
    it("should successfully verify a valid Ed25519 signature", async () => {
      // Generate real Ed25519 keypair to sign and verify
      const keypair = (await crypto.subtle.generateKey(
        { name: "Ed25519" },
        true,
        ["sign", "verify"]
      )) as CryptoKeyPair;

      const publicKeyBuffer = (await crypto.subtle.exportKey("raw", keypair.publicKey)) as ArrayBuffer;
      const publicKeyHex = Array.from(new Uint8Array(publicKeyBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const timestamp = "1689000000";
      const body = '{"type":1}';
      const encoder = new TextEncoder();
      const data = encoder.encode(timestamp + body);

      const signatureBuffer = await crypto.subtle.sign("Ed25519", keypair.privateKey, data);
      const signatureHex = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const program = Effect.flatMap(DiscordSignatureVerifier, (verifier) =>
        verifier.verify(body, signatureHex, timestamp, publicKeyHex)
      ).pipe(Effect.provide(DiscordSignatureVerifierLive));

      const result = await Effect.runPromise(program);
      expect(result).toBe(true);
    });

    it("should return false for invalid signature hex", async () => {
      const timestamp = "1689000000";
      const body = '{"type":1}';
      const fakeSig = "a".repeat(64);
      const fakePubKey = "b".repeat(64);

      const program = Effect.flatMap(DiscordSignatureVerifier, (verifier) =>
        verifier.verify(body, fakeSig, timestamp, fakePubKey)
      ).pipe(Effect.provide(DiscordSignatureVerifierLive));

      const result = await Effect.runPromise(program);
      expect(result).toBe(false);
    });
  });

  describe("DiscordInteractionParser", () => {
    it("should parse PING (Type 1)", async () => {
      const pingBody = JSON.stringify({ type: 1 });

      const program = Effect.flatMap(DiscordInteractionParser, (parser) =>
        parser.parse(pingBody)
      ).pipe(Effect.provide(DiscordInteractionParserLive));

      const result = await Effect.runPromise(program);
      expect(result._tag).toBe("Ping");
    });

    it("should parse Slash Command (Type 2)", async () => {
      const cmdBody = JSON.stringify({
        type: 2,
        user: {
          id: "12345",
          username: "alice",
          global_name: "Alice"
        },
        channel_id: "99999",
        data: {
          name: "challenge",
          options: [
            { name: "opponent", value: "67890" }
          ]
        }
      });

      const program = Effect.flatMap(DiscordInteractionParser, (parser) =>
        parser.parse(cmdBody)
      ).pipe(Effect.provide(DiscordInteractionParserLive));

      const result = await Effect.runPromise(program);
      expect(result._tag).toBe("Command");
      if (result._tag === "Command") {
        expect(result.commandName).toBe("challenge");
        expect(result.user.id).toBe("12345");
        expect(result.user.username).toBe("alice");
        expect(result.channelId).toBe("99999");
        expect(result.options.opponent).toBe("67890");
      }
    });

    it("should parse Message Component (Type 3)", async () => {
      const compBody = JSON.stringify({
        type: 3,
        member: {
          user: {
            id: "67890",
            username: "bob",
            global_name: "Bob"
          }
        },
        channel_id: "88888",
        data: {
          custom_id: "roll_00100"
        }
      });

      const program = Effect.flatMap(DiscordInteractionParser, (parser) =>
        parser.parse(compBody)
      ).pipe(Effect.provide(DiscordInteractionParserLive));

      const result = await Effect.runPromise(program);
      expect(result._tag).toBe("Component");
      if (result._tag === "Component") {
        expect(result.customId).toBe("roll_00100");
        expect(result.user.id).toBe("67890");
        expect(result.user.username).toBe("bob");
        expect(result.channelId).toBe("88888");
      }
    });
  });

  describe("DiscordResponseSerializer", () => {
    const mockGameState: GameState = {
      gameId: "game-abc",
      mode: "single",
      status: "Rolling",
      currentPlayerIndex: 0,
      rollCount: 1,
      currentDice: [1, 2, 3, 4, 5],
      players: [
        {
          playerId: "12345",
          playerName: "Alice",
          scoreBoard: { Aces: 3 },
          bonusScore: 0,
          totalScore: 3
        }
      ],
      turnHistory: [],
      currentTurnRolls: []
    };

    it("should serialize GameState into update message interaction response", async () => {
      const program = Effect.flatMap(DiscordResponseSerializer, (serializer) =>
        Effect.sync(() => serializer.serializeGame(mockGameState, "00100"))
      ).pipe(Effect.provide(DiscordResponseSerializerLive));

      const response = await Effect.runPromise(program);
      expect(response.type).toBe(7); // UpdateMessage
      expect(response.data?.embeds?.[0].title).toBe("🎲 Yacht Dice Game");
      expect(response.data?.embeds?.[0].description).toContain("Alice");
      expect(response.data?.embeds?.[0].description).toContain("▫️ ▫️ 🔒 ▫️ ▫️");
      expect(response.data?.components).toHaveLength(3); // hold buttons row, roll button row, category select row
      const actionRow2 = response.data?.components?.[1];
      const refreshBtn = actionRow2?.components?.[2] as any;
      expect(refreshBtn.custom_id).toBe("refresh_game");
      expect(refreshBtn.style).toBe(2);
      expect(refreshBtn.emoji).toEqual({ name: "🔄" });
    });

    it("should render scoreboard within 27 characters per line for 2 players", async () => {
      const state2Players: GameState = {
        gameId: "game-123",
        mode: "multi",
        status: "Rolling",
        currentPlayerIndex: 0,
        rollCount: 0,
        currentDice: [1, 1, 1, 1, 1],
        players: [
          { playerId: "p1", playerName: "Alice", scoreBoard: { Aces: 3 }, bonusScore: 0, totalScore: 3 },
          { playerId: "p2", playerName: "Bob", scoreBoard: { Deuces: 6 }, bonusScore: 0, totalScore: 6 }
        ],
        turnHistory: [],
        currentTurnRolls: []
      };

      const program = Effect.flatMap(DiscordResponseSerializer, (serializer) =>
        Effect.sync(() => serializer.serializeGame(state2Players))
      ).pipe(Effect.provide(DiscordResponseSerializerLive));

      const response = await Effect.runPromise(program);
      const description = response.data?.embeds?.[0].description || "";
      
      const match = description.match(/```\n([\s\S]*?)\n```/);
      expect(match).not.toBeNull();
      
      if (match) {
        const scoreboardContent = match[1];
        const lines = scoreboardContent.split("\n");
        for (const line of lines) {
          expect(line.length).toBeLessThanOrEqual(27);
        }
      }
    });

    it("should serialize Finished GameState with empty components list to remove buttons in Discord", async () => {
      const finishedGameState: GameState = {
        ...mockGameState,
        status: "Finished",
        players: [
          {
            ...mockGameState.players[0],
            scoreBoard: {
              Aces: 3, Deuces: 6, Treys: 9, Fours: 12, Fives: 15, Sixes: 18,
              Choice: 20, FourOfAKind: 24, FullHouse: 28, SmallStraight: 30, LargeStraight: 40, Yacht: 50
            }
          }
        ]
      };

      const program = Effect.flatMap(DiscordResponseSerializer, (serializer) =>
        Effect.sync(() => serializer.serializeGame(finishedGameState))
      ).pipe(Effect.provide(DiscordResponseSerializerLive));

      const response = await Effect.runPromise(program);
      expect(response.type).toBe(7); // UpdateMessage
      expect(response.data?.embeds?.[0].description).toContain("🏆 **Game Finished!**");
      expect(response.data?.components).toEqual([]); // Should be empty array, not undefined, to clear buttons
    });

    it("should serialize GameState including last turn action details when turnHistory is not empty", async () => {
      const stateWithHistory: GameState = {
        ...mockGameState,
        turnHistory: [
          {
            playerIndex: 0,
            playerName: "Alice",
            turnNumber: 1,
            rolls: [[1, 1, 1, 4, 5]],
            category: "Aces",
            score: 3,
            cumulativeScore: 3
          }
        ]
      };

      const program = Effect.flatMap(DiscordResponseSerializer, (serializer) =>
        Effect.sync(() => serializer.serializeGame(stateWithHistory, "00000"))
      ).pipe(Effect.provide(DiscordResponseSerializerLive));

      const response = await Effect.runPromise(program);
      expect(response.data?.embeds?.[0].description).toContain("Last Turn Action");
      expect(response.data?.embeds?.[0].description).toContain("Alice");
      expect(response.data?.embeds?.[0].description).toContain("**3 pts** in **Aces**");
      expect(response.data?.embeds?.[0].description).toContain(":one: :one: :one: :four: :five:");
    });

    it("should display bonus-inclusive cumulative scores for legacy history", async () => {
      const match: MatchRecord = {
        id: "match-history",
        mode: "single",
        guildId: null,
        player1Id: "12345",
        player2Id: null,
        player1Score: 110,
        player2Score: null,
        winnerId: null,
        surrenderedId: null,
        playedAt: new Date("2026-07-10T12:00:00.000Z"),
        historyJson: JSON.stringify([
          { playerIndex: 0, playerName: "Alice", turnNumber: 1, rolls: [[6, 6, 6, 6, 6]], category: "Sixes", score: 30 },
          { playerIndex: 0, playerName: "Alice", turnNumber: 2, rolls: [[5, 5, 5, 5, 5]], category: "Fives", score: 25 },
          { playerIndex: 0, playerName: "Alice", turnNumber: 3, rolls: [[4, 4, 4, 4, 4]], category: "Fours", score: 20 }
        ])
      };

      const program = Effect.flatMap(DiscordResponseSerializer, (serializer) =>
        Effect.sync(() => serializer.serializeHistoryDetails(match, 1))
      ).pipe(Effect.provide(DiscordResponseSerializerLive));

      const response = await Effect.runPromise(program);
      expect(response.data?.embeds?.[0].description).toContain("Fours ➔ **20 pts** (누적 **110 pts**)");
    });

    it("should serialize rolling state with a random Giphy URL from the pool", async () => {
      const program = Effect.flatMap(DiscordResponseSerializer, (serializer) =>
        Effect.sync(() => serializer.serializeRolling(mockGameState, "00100"))
      ).pipe(Effect.provide(DiscordResponseSerializerLive));

      const response = await Effect.runPromise(program);
      expect(response.type).toBe(7); // UpdateMessage
      expect(response.data?.embeds?.[0].title).toBe("🎲 Yacht Dice Game");
      const imageUrl = response.data?.embeds?.[0].image?.url;
      expect(imageUrl).toBeDefined();
      
      const allowedGiphys = [
        "https://media.giphy.com/media/VGoZVlR9naOZCiRLSy/giphy.gif",
        "https://media.giphy.com/media/3ohjUMQWKmu9GbjP4A/giphy.gif",
        "https://media.giphy.com/media/lTYLtiktVNr0k3SVOP/giphy.gif",
        "https://media.giphy.com/media/p24SMLHXZhmUgKOx1F/giphy.gif",
        "https://media.giphy.com/media/7upMd5l83SsP2GMxmL/giphy.gif",
        "https://media.giphy.com/media/YQmyu4dbNa9qdNh4iI/giphy.gif",
        "https://media.giphy.com/media/sLwfBfMlWTDbVLJApS/giphy.gif"
      ];
      expect(allowedGiphys).toContain(imageUrl);
    });

    it("should serialize leaderboard into message interaction response", async () => {
      const mockLeaderboard: PlayerStats[] = [
        {
          id: "12345",
          name: "Alice",
          wins: 10,
          losses: 2,
          draws: 0,
          highestScore: 240,
          soloPlayCount: 5,
          soloHighestScore: 180,
          multiWins: 10,
          multiLosses: 2,
          multiDraws: 0,
          multiHighestScore: 240,
          elo: 1200,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const program = Effect.flatMap(DiscordResponseSerializer, (serializer) =>
        Effect.sync(() => serializer.serializeLeaderboard(mockLeaderboard, "multi"))
      ).pipe(Effect.provide(DiscordResponseSerializerLive));

      const response = await Effect.runPromise(program);
      expect(response.type).toBe(4); // ChannelMessageWithSource
      expect(response.data?.embeds?.[0].title).toBe("🏆 Yacht Dice Leaderboard (Matching Mode)");
      expect(response.data?.embeds?.[0].fields?.[0].name).toContain("Alice");
      expect(response.data?.embeds?.[0].fields?.[0].value).toContain("Wins: **10**");
    });

    it("should include concise 🪰 button in invitation serialization", async () => {
      const mockInvitation = {
        id: "inv-123",
        challengerId: "user-1",
        challengerName: "Alice",
        opponentId: "user-2",
        opponentName: "Bob",
        guildId: "guild-1",
        channelId: "chan-1",
        status: "PENDING" as const,
        createdAt: Date.now(),
        expiresAt: Date.now() + 300000
      };

      const program = Effect.flatMap(DiscordResponseSerializer, (serializer) =>
        Effect.sync(() => serializer.serializeInvitation(mockInvitation))
      ).pipe(Effect.provide(DiscordResponseSerializerLive));

      const response = await Effect.runPromise(program);
      const row = response.data?.components?.[0];
      expect(row?.components).toHaveLength(3);
      const flyButton = row?.components?.find(c => c.custom_id === "invitation:play_ai:inv-123") as any;
      expect(flyButton).toBeDefined();
      expect(flyButton?.emoji?.name).toBe("🪰");
    });

    it("should include concise 🪰 button in match queue serialization", async () => {
      const mockQueue = {
        id: "queue-123",
        hostId: "user-1",
        hostName: "Alice",
        guildId: "guild-1",
        channelId: "chan-1",
        status: "WAITING" as const,
        createdAt: Date.now(),
        expiresAt: Date.now() + 300000
      };

      const program = Effect.flatMap(DiscordResponseSerializer, (serializer) =>
        Effect.sync(() => serializer.serializeMatchQueue(mockQueue))
      ).pipe(Effect.provide(DiscordResponseSerializerLive));

      const response = await Effect.runPromise(program);
      const row = response.data?.components?.[0];
      expect(row?.components).toHaveLength(3);
      const flyButton = row?.components?.find(c => c.custom_id === "queue:play_ai:queue-123") as any;
      expect(flyButton).toBeDefined();
      expect(flyButton?.emoji?.name).toBe("🪰");
    });

    it("should serialize colosseum match and betting buttons", async () => {
      const match = {
        id: "col-123",
        guildId: "g1",
        channelId: "c1",
        personaAId: "Jackpot",
        personaBId: "Newton",
        oddsA: 1.85,
        oddsB: 2.10,
        status: "BETTING" as const,
        createdAt: new Date()
      };
      const bets = [
        {
          id: "b1",
          matchId: "col-123",
          userId: "u1",
          userName: "Alice",
          chosenPersona: "A" as const,
          amount: 20,
          odds: 1.85,
          payout: 0,
          status: "PENDING" as const,
          createdAt: new Date()
        }
      ];

      const program = Effect.flatMap(DiscordResponseSerializer, (serializer) =>
        Effect.sync(() => serializer.serializeColosseumMatch(match, bets))
      ).pipe(Effect.provide(DiscordResponseSerializerLive));

      const response = await Effect.runPromise(program);
      expect(response.type).toBe(4);
      expect(response.data?.embeds?.[0].title).toContain("초파리 콜로세움");
      expect(response.data?.components?.[0].components).toHaveLength(3);
    });

    it("should serialize colosseum clash and results", async () => {
      const match = {
        id: "col-123",
        guildId: "g1",
        channelId: "c1",
        personaAId: "Jackpot",
        personaBId: "Newton",
        oddsA: 1.85,
        oddsB: 2.10,
        status: "SIMULATING" as const,
        createdAt: new Date()
      };
      const duelData = {
        winner: "A",
        score_a: 210,
        score_b: 195,
        diff: 15,
        lead_changes: 2,
        rounds: Array.from({ length: 12 }, (_, i) => ({
          round: i + 1,
          a: { category: "Yacht", points: 50, total: 210, dopamine: 220, dialogue: "야추다 붕!", dice: [5, 5, 5, 5, 5] },
          b: { category: "FullHouse", points: 28, total: 195, dopamine: 130, dialogue: "침착하게 붕.", dice: [3, 3, 3, 2, 2] },
          leader: "A",
          is_lead_change: false
        }))
      };

      const program = Effect.gen(function* () {
        const serializer = yield* DiscordResponseSerializer;
        const clash = serializer.serializeColosseumClash(match, [], duelData, 1);
        const result = serializer.serializeColosseumResult(match, [], duelData);
        return { clash, result };
      }).pipe(Effect.provide(DiscordResponseSerializerLive));

      const { clash, result } = await Effect.runPromise(program);
      expect(clash.data?.embeds?.[0].title).toContain("챕터 1/6");
      expect(clash.data?.embeds?.[0].description).toContain("Category");
      expect(result.data?.embeds?.[0].title).toContain("최종 경기 결과");
      expect(result.data?.embeds?.[0].description).toContain("승자");
      expect(result.data?.embeds?.[0].description).toContain("Category");
    });
  });
});

