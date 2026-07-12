import { describe, it, expect } from "vitest";
import { Effect, Option } from "effect";
import { DiscordSignatureVerifier, DiscordSignatureVerifierLive } from "./signature";
import { DiscordInteractionParser, DiscordInteractionParserLive } from "./parser";
import { DiscordResponseSerializer, DiscordResponseSerializerLive } from "./serializer";
import { GameState } from "../../../domain/types";
import { PlayerStats } from "../../../persistence/repository";

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
      expect(response.data?.embeds?.[0].description).toContain("Dice 3: **:three:** [HELD]");
      expect(response.data?.components).toHaveLength(3); // hold buttons row, roll button row, category select row
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
            score: 3
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
  });
});
