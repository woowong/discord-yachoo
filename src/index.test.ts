import { describe, it, expect, vi, beforeEach } from "vitest";
import worker from "./index";
import { D1Database } from "./persistence/d1/database";

describe("Discord Yacht Bot Integration Tests", () => {
  let keypair: CryptoKeyPair;
  let publicKeyHex: string;
  let mockDB: D1Database;
  const mockRun = vi.fn();
  const mockFirst = vi.fn();
  const mockAll = vi.fn();
  const mockBind = vi.fn();

  beforeEach(async () => {
    // Generate keypair for valid signatures
    keypair = (await crypto.subtle.generateKey(
      { name: "Ed25519" },
      true,
      ["sign", "verify"]
    )) as CryptoKeyPair;

    const publicKeyBuffer = await crypto.subtle.exportKey("raw", keypair.publicKey);
    publicKeyHex = Array.from(new Uint8Array(publicKeyBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Reset mocks
    vi.resetAllMocks();

    const mockStmt: any = {
      bind: mockBind,
      first: mockFirst,
      run: mockRun,
      all: mockAll,
      raw: vi.fn(),
    };

    mockBind.mockReturnValue(mockStmt);
    mockFirst.mockResolvedValue(null);
    mockRun.mockResolvedValue({ success: true, results: [], meta: {} });
    mockAll.mockResolvedValue({ success: true, results: [], meta: {} });

    mockDB = {
      prepare: vi.fn().mockReturnValue(mockStmt),
      batch: vi.fn(),
      exec: vi.fn(),
    };
  });

  const createSignedRequest = async (body: string, customSig?: string): Promise<Request> => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const encoder = new TextEncoder();
    const data = encoder.encode(timestamp + body);
    const signatureHex = customSig || (() => {
      // Synchronous buffer to hex helper
      return "";
    })();

    const sigBuffer = await crypto.subtle.sign("Ed25519", keypair.privateKey, data);
    const sigHex = customSig || Array.from(new Uint8Array(sigBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return new Request("http://localhost/", {
      method: "POST",
      headers: {
        "x-signature-ed25519": sigHex,
        "x-signature-timestamp": timestamp,
        "content-type": "application/json"
      },
      body
    });
  };

  it("should return 401 when signature is invalid", async () => {
    const body = JSON.stringify({ type: 1 });
    const req = await createSignedRequest(body, "a".repeat(64));
    const res = await worker.fetch(req, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex });
    expect(res.status).toBe(401);
  });

  it("should return 401 when signature headers are missing", async () => {
    const req = new Request("http://localhost/", {
      method: "POST",
      body: JSON.stringify({ type: 1 })
    });
    const res = await worker.fetch(req, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex });
    expect(res.status).toBe(401);
  });

  it("should handle PING (Type 1) successfully", async () => {
    const body = JSON.stringify({ type: 1 });
    const req = await createSignedRequest(body);
    const res = await worker.fetch(req, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.type).toBe(1);
  });

  it("should handle /challenge slash command (single mode) and save state", async () => {
    const body = JSON.stringify({
      type: 2,
      user: {
        id: "12345",
        username: "alice",
        global_name: "Alice"
      },
      data: {
        name: "challenge",
        options: []
      }
    });

    const req = await createSignedRequest(body);
    const res = await worker.fetch(req, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.type).toBe(4); // ChannelMessageWithSource
    expect(json.data.embeds[0].title).toBe("🎲 Yacht Dice Game");
    expect(json.data.embeds[0].description).toContain("Alice");

    // Verify D1 queries: Player upsert and active game saving
    expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO players"));
    expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO active_games"));
  });

  it("should handle /profile command", async () => {
    mockFirst.mockResolvedValue({
      id: "12345",
      name: "Alice",
      wins: 10,
      losses: 5,
      draws: 1,
      highest_score: 220,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const body = JSON.stringify({
      type: 2,
      user: {
        id: "12345",
        username: "alice",
        global_name: "Alice"
      },
      data: {
        name: "profile"
      }
    });

    const req = await createSignedRequest(body);
    const res = await worker.fetch(req, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.type).toBe(4);
    expect(json.data.content).toContain("Player Profile: Alice");
    expect(json.data.content).toContain("Wins: **10**");
    expect(json.data.content).toContain("Highest Score: **220**");
  });

  it("should handle /leaderboard command", async () => {
    mockAll.mockResolvedValue({
      success: true,
      results: [
        {
          id: "12345",
          name: "Alice",
          wins: 10,
          losses: 5,
          draws: 1,
          highest_score: 220,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    });

    const body = JSON.stringify({
      type: 2,
      user: {
        id: "12345",
        username: "alice",
        global_name: "Alice"
      },
      data: {
        name: "leaderboard"
      }
    });

    const req = await createSignedRequest(body);
    const res = await worker.fetch(req, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.type).toBe(4);
    expect(json.data.embeds[0].title).toBe("🏆 Yacht Dice Leaderboard");
    expect(json.data.embeds[0].fields[0].name).toContain("Alice");
  });

  it("should handle component hold_ interactions", async () => {
    const mockGameState = {
      gameId: "game-123",
      mode: "single",
      players: [
        {
          playerId: "12345",
          playerName: "Alice",
          scoreBoard: {},
          bonusScore: 0,
          totalScore: 0
        }
      ],
      currentPlayerIndex: 0,
      status: "Rolling",
      currentDice: [1, 2, 3, 4, 5],
      rollCount: 1
    };

    mockFirst.mockResolvedValue({
      state: JSON.stringify(mockGameState)
    });

    const body = JSON.stringify({
      type: 3,
      user: {
        id: "12345",
        username: "alice",
        global_name: "Alice"
      },
      data: {
        custom_id: "hold_2_00100" // Toggle middle die
      },
      message: {
        embeds: [
          {
            title: "🎲 Yacht Dice Game",
            description: "Some description",
            footer: {
              text: "Game ID: game-123"
            }
          }
        ]
      }
    });

    const req = await createSignedRequest(body);
    const res = await worker.fetch(req, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.type).toBe(7); // UpdateMessage
    expect(json.data.embeds[0].description).toContain("Dice 3: **⚂** [HELD]");
  });
});
