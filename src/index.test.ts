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

    const publicKeyBuffer = (await crypto.subtle.exportKey("raw", keypair.publicKey)) as ArrayBuffer;
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
    const res = await worker.fetch(req, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex }, {} as any);
    expect(res.status).toBe(401);
  });

  it("should return 401 when signature headers are missing", async () => {
    const req = new Request("http://localhost/", {
      method: "POST",
      body: JSON.stringify({ type: 1 })
    });
    const res = await worker.fetch(req, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex }, {} as any);
    expect(res.status).toBe(401);
  });

  it("should handle PING (Type 1) successfully", async () => {
    const body = JSON.stringify({ type: 1 });
    const req = await createSignedRequest(body);
    const res = await worker.fetch(req, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex }, {} as any);
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
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
    const res = await worker.fetch(req, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex }, {} as any);
    expect(res.status).toBe(200);

    const json = (await res.json()) as any;
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
    const res = await worker.fetch(req, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex }, {} as any);
    expect(res.status).toBe(200);

    const json = (await res.json()) as any;
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
    const res = await worker.fetch(req, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex }, {} as any);
    expect(res.status).toBe(200);

    const json = (await res.json()) as any;
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
    const res = await worker.fetch(req, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex }, {} as any);
    expect(res.status).toBe(200);

    const json = (await res.json()) as any;
    expect(json.type).toBe(7); // UpdateMessage
    expect(json.data.embeds[0].description).toContain("Dice 3: **:three:** [HELD]");
  });

  it("should handle /history slash command (no options) and list recent matches", async () => {
    mockAll.mockResolvedValue({
      success: true,
      results: [
        {
          id: "match-123",
          mode: "single",
          player1_id: "12345",
          player2_id: null,
          player1_score: 150,
          player2_score: null,
          winner_id: null,
          played_at: "2026-07-10T12:00:00.000Z",
          history_json: null
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
        name: "history",
        options: []
      }
    });

    const req = await createSignedRequest(body);
    const res = await worker.fetch(req, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex }, {} as any);
    expect(res.status).toBe(200);

    const json = (await res.json()) as any;
    expect(json.type).toBe(4);
    expect(json.data.embeds[0].title).toBe("🏆 Recent Yacht Dice Matches");
    expect(json.data.embeds[0].description).toContain("Single Play");
    expect(json.data.components[0].components[0].custom_id).toBe("viewhistory_match-123");
  });

  it("should handle /history slash command with game_id and show details", async () => {
    mockFirst.mockResolvedValue({
      id: "match-123",
      mode: "single",
      player1_id: "12345",
      player2_id: null,
      player1_score: 150,
      player2_score: null,
      winner_id: null,
      played_at: "2026-07-10T12:00:00.000Z",
      history_json: JSON.stringify([{
        playerIndex: 0,
        playerName: "Alice",
        turnNumber: 1,
        rolls: [[1, 2, 3, 4, 5]],
        category: "Choice",
        score: 15
      }])
    });

    const body = JSON.stringify({
      type: 2,
      user: {
        id: "12345",
        username: "alice",
        global_name: "Alice"
      },
      data: {
        name: "history",
        options: [
          {
            name: "game_id",
            type: 3,
            value: "match-123"
          }
        ]
      }
    });

    const req = await createSignedRequest(body);
    const res = await worker.fetch(req, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex }, {} as any);
    expect(res.status).toBe(200);

    const json = (await res.json()) as any;
    expect(json.type).toBe(4); // Forced type 4
    expect(json.data.embeds[0].title).toContain("Match Details: match-123");
    expect(json.data.embeds[0].description).toContain("Choice ➔ **15 pts**");
  });

  it("should handle viewhistory_ and pagehistory_ component interactions", async () => {
    mockFirst.mockResolvedValue({
      id: "match-123",
      mode: "single",
      player1_id: "12345",
      player2_id: null,
      player1_score: 150,
      player2_score: null,
      winner_id: null,
      played_at: "2026-07-10T12:00:00.000Z",
      history_json: JSON.stringify([{
        playerIndex: 0,
        playerName: "Alice",
        turnNumber: 1,
        rolls: [[1, 2, 3, 4, 5]],
        category: "Choice",
        score: 15
      }])
    });

    // Test viewhistory_match-123
    const bodyView = JSON.stringify({
      type: 3,
      user: {
        id: "12345",
        username: "alice",
        global_name: "Alice"
      },
      data: {
        custom_id: "viewhistory_match-123"
      }
    });

    const reqView = await createSignedRequest(bodyView);
    const resView = await worker.fetch(reqView, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex }, {} as any);
    expect(resView.status).toBe(200);
    const jsonView = await resView.json() as any;
    expect(jsonView.type).toBe(7); // UpdateMessage
    expect(jsonView.data.embeds[0].title).toContain("Match Details: match-123");

    // Test pagehistory_match-123_2
    const bodyPage = JSON.stringify({
      type: 3,
      user: {
        id: "12345",
        username: "alice",
        global_name: "Alice"
      },
      data: {
        custom_id: "pagehistory_match-123_2"
      }
    });

    const reqPage = await createSignedRequest(bodyPage);
    const resPage = await worker.fetch(reqPage, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex }, {} as any);
    expect(resPage.status).toBe(200);
    const jsonPage = await resPage.json() as any;
    expect(jsonPage.type).toBe(7); // UpdateMessage
    expect(jsonPage.data.embeds[0].title).toContain("Rounds 7-12");
  });

  it("should handle backtohistorylist component interaction", async () => {
    mockAll.mockResolvedValue({
      success: true,
      results: [
        {
          id: "match-123",
          mode: "single",
          player1_id: "12345",
          player2_id: null,
          player1_score: 150,
          player2_score: null,
          winner_id: null,
          played_at: "2026-07-10T12:00:00.000Z",
          history_json: null
        }
      ]
    });

    const body = JSON.stringify({
      type: 3,
      user: {
        id: "12345",
        username: "alice",
        global_name: "Alice"
      },
      data: {
        custom_id: "backtohistorylist"
      }
    });

    const req = await createSignedRequest(body);
    const res = await worker.fetch(req, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex }, {} as any);
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.type).toBe(7); // UpdateMessage
    expect(json.data.embeds[0].title).toBe("🏆 Recent Yacht Dice Matches");
  });
});
