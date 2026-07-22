// @ts-nocheck
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
      batch: vi.fn().mockResolvedValue([]),
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

  it("should block self-challenge in /challenge slash command", async () => {
    const body = JSON.stringify({
      type: 2,
      user: {
        id: "12345",
        username: "alice",
        global_name: "Alice"
      },
      data: {
        name: "challenge",
        options: [
          {
            name: "opponent",
            value: "12345"
          }
        ],
        resolved: {
          users: {
            "12345": {
              id: "12345",
              username: "alice",
              global_name: "Alice"
            }
          }
        }
      }
    });

    const req = await createSignedRequest(body);
    const res = await worker.fetch(req, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex }, {} as any);
    expect(res.status).toBe(200);

    const json = (await res.json()) as any;
    expect(json.type).toBe(4);
    expect(json.data.content).toContain("자기 자신에게는 도전할 수 없습니다");
    expect(json.data.flags).toBe(64);
  });

  it("should handle /profile command", async () => {
    mockFirst.mockResolvedValue({
      id: "12345",
      name: "Alice",
      wins: 10,
      losses: 5,
      draws: 1,
      highest_score: 220,
      solo_play_count: 5,
      solo_highest_score: 180,
      multi_wins: 10,
      multi_losses: 5,
      multi_draws: 1,
      multi_highest_score: 220,
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
    expect(json.data.content).toContain("Games Played: **5**");
    expect(json.data.content).toContain("Wins: **10**");
    expect(json.data.content).toContain("Highest Score: **220**");
  });

  it("should handle /profile command with guild_id and use guild-scoped query", async () => {
    mockFirst.mockResolvedValue({
      id: "12345",
      name: "Alice",
      wins: 1,
      losses: 0,
      draws: 0,
      highest_score: 120,
      solo_play_count: 1,
      solo_highest_score: 120,
      multi_wins: 0,
      multi_losses: 0,
      multi_draws: 0,
      multi_highest_score: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const body = JSON.stringify({
      type: 2,
      guild_id: "guild-abc",
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

    expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining("LEFT JOIN guild_player_stats"));
    expect(mockBind).toHaveBeenCalledWith("guild-abc", "12345");
  });

  it("should handle /leaderboard command (default matching)", async () => {
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
          solo_play_count: 5,
          solo_highest_score: 180,
          multi_wins: 10,
          multi_losses: 5,
          multi_draws: 1,
          multi_highest_score: 220,
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
    expect(json.data.embeds[0].title).toBe("🏆 Yacht Dice Leaderboard (Matching Mode)");
    expect(json.data.embeds[0].fields[0].name).toContain("Alice");
    expect(json.data.embeds[0].fields[0].value).toContain("Wins: **10**");
  });

  it("should handle /leaderboard command (solo option)", async () => {
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
          solo_play_count: 5,
          solo_highest_score: 180,
          multi_wins: 10,
          multi_losses: 5,
          multi_draws: 1,
          multi_highest_score: 220,
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
        name: "leaderboard",
        options: [
          {
            name: "type",
            type: 3,
            value: "solo"
          }
        ]
      }
    });

    const req = await createSignedRequest(body);
    const res = await worker.fetch(req, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex }, {} as any);
    expect(res.status).toBe(200);

    const json = (await res.json()) as any;
    expect(json.type).toBe(4);
    expect(json.data.embeds[0].title).toBe("🏆 Yacht Dice Leaderboard (Solo Mode)");
    expect(json.data.embeds[0].fields[0].name).toContain("Alice");
    expect(json.data.embeds[0].fields[0].value).toContain("Best Score: **180**");
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

  it("should send mention message to the next player on turn transition in multi mode", async () => {
    const originalFetch = global.fetch;
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "new-mention-msg-123" }),
      text: async () => "{}"
    });
    global.fetch = fetchSpy;

    const mockGameState = {
      gameId: "game-multi-123",
      mode: "multi",
      players: [
        { playerId: "12345", playerName: "Alice", scoreBoard: {}, bonusScore: 0, totalScore: 0 },
        { playerId: "67890", playerName: "Bob", scoreBoard: {}, bonusScore: 0, totalScore: 0 }
      ],
      currentPlayerIndex: 0,
      status: "Rolling",
      currentDice: [1, 2, 3, 4, 5],
      rollCount: 1,
      turnHistory: [],
      currentTurnRolls: []
    };

    mockFirst.mockResolvedValue({
      state: JSON.stringify(mockGameState)
    });

    const body = JSON.stringify({
      type: 3,
      user: { id: "12345", username: "alice" },
      channel_id: "channel-777",
      data: {
        custom_id: "select_category",
        values: ["Aces"]
      },
      message: {
        id: "game-board-msg-123",
        embeds: [{ title: "🎲 Yacht Dice Game", footer: { text: "Game ID: game-multi-123" } }]
      }
    });

    const req = await createSignedRequest(body);
    const ctx = {
      waitUntil: vi.fn((promise) => promise)
    };
    
    const res = await worker.fetch(
      req, 
      { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex, DISCORD_BOT_TOKEN: "mock-bot-token" }, 
      ctx as any
    );
    expect(res.status).toBe(200);

    if (ctx.waitUntil.mock.calls.length > 0) {
      await Promise.all(ctx.waitUntil.mock.calls.map(call => call[0]));
    }

    expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO active_games"));
    const savedStateStr = mockBind.mock.calls.find(call => typeof call[1] === "string" && call[1].includes("lastMentionMessageId"))?.[1];
    expect(savedStateStr).toBeDefined();
    const savedState = JSON.parse(savedStateStr);
    expect(savedState.lastMentionMessageId).toBe("new-mention-msg-123");
    expect(savedState.lastMentionChannelId).toBe("channel-777");

    const mentionCall = fetchSpy.mock.calls.find(call => call[0].includes("/channels/channel-777/messages") && call[1]?.method === "POST");
    expect(mentionCall).toBeDefined();
    const mentionBody = JSON.parse(mentionCall[1].body);
    expect(mentionBody.content).toContain("<@67890>");
    expect(mentionBody.message_reference).toEqual({
      message_id: "game-board-msg-123",
      fail_if_not_exists: false
    });

    global.fetch = originalFetch;
  });

  it("should delete existing mention message when player performs roll action", async () => {
    const originalFetch = global.fetch;
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => "{}"
    });
    global.fetch = fetchSpy;

    const mockGameState = {
      gameId: "game-multi-123",
      mode: "multi",
      players: [
        { playerId: "12345", playerName: "Alice", scoreBoard: {}, bonusScore: 0, totalScore: 0 },
        { playerId: "67890", playerName: "Bob", scoreBoard: {}, bonusScore: 0, totalScore: 0 }
      ],
      currentPlayerIndex: 1,
      status: "Rolling",
      currentDice: [1, 2, 3, 4, 5],
      rollCount: 1,
      turnHistory: [],
      currentTurnRolls: [],
      lastMentionMessageId: "mention-msg-abc",
      lastMentionChannelId: "channel-777"
    };

    mockFirst.mockResolvedValue({
      state: JSON.stringify(mockGameState)
    });

    const body = JSON.stringify({
      type: 3,
      user: { id: "67890", username: "bob" },
      channel_id: "channel-777",
      data: {
        custom_id: "roll_00000"
      },
      message: {
        embeds: [{ title: "🎲 Yacht Dice Game", footer: { text: "Game ID: game-multi-123" } }]
      }
    });

    const req = await createSignedRequest(body);
    const ctx = {
      waitUntil: vi.fn((promise) => promise)
    };
    
    const res = await worker.fetch(
      req, 
      { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex, DISCORD_BOT_TOKEN: "mock-bot-token" }, 
      ctx as any
    );
    expect(res.status).toBe(200);

    if (ctx.waitUntil.mock.calls.length > 0) {
      await Promise.all(ctx.waitUntil.mock.calls.map(call => call[0]));
    }

    const deleteCall = fetchSpy.mock.calls.find(call => call[0].includes("/channels/channel-777/messages/mention-msg-abc") && call[1]?.method === "DELETE");
    expect(deleteCall).toBeDefined();

    const saveCall = mockBind.mock.calls.find(call => typeof call[1] === "string" && call[1].includes("game-multi-123"));
    expect(saveCall).toBeDefined();
    const savedState = JSON.parse(saveCall[1]);
    expect(savedState.lastMentionMessageId).toBeUndefined();
    expect(savedState.lastMentionChannelId).toBeUndefined();

    global.fetch = originalFetch;
  });

  it("should return readable error message instead of [object Object] when RollLimitExceededError occurs", async () => {
    // 1. Mock the game state database to return a game with rollCount = 3 (limit reached)
    const mockGameState = {
      gameId: "game-limit-123",
      mode: "multi",
      status: "Rolling",
      currentPlayerIndex: 0,
      players: [
        {
          playerId: "12345",
          playerName: "Alice",
          scoreBoard: {},
          bonusScore: 0,
          totalScore: 0
        }
      ],
      currentDice: [1, 2, 3, 4, 5],
      rollCount: 3,
      turnHistory: [],
      currentTurnRolls: []
    };

    mockFirst.mockResolvedValue({
      state: JSON.stringify(mockGameState)
    });

    // 2. Prepare component interaction that attempts to roll dice
    const body = JSON.stringify({
      type: 3,
      user: { id: "12345", username: "alice" },
      channel_id: "channel-777",
      data: {
        custom_id: "roll_00000"
      },
      message: {
        embeds: [{ title: "🎲 Yacht Dice Game", footer: { text: "Game ID: game-limit-123" } }]
      }
    });

    const req = await createSignedRequest(body);
    const res = await worker.fetch(req, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex }, {} as any);
    expect(res.status).toBe(200);

    const json = (await res.json()) as any;
    expect(json.type).toBe(4); // ChannelMessageWithSource
    expect(json.data.content).toContain("❌ **Error:** Roll limit exceeded.");
    expect(json.data.content).not.toContain("[object Object]");
  });

  it("should gracefully refresh game message and remove components when clicking roll on finished game", async () => {
    const mockGameState = {
      gameId: "game-finished-123",
      mode: "single",
      status: "Finished",
      currentPlayerIndex: 0,
      players: [
        {
          playerId: "12345",
          playerName: "Alice",
          scoreBoard: {
            Aces: 3, Deuces: 6, Treys: 9, Fours: 12, Fives: 15, Sixes: 18,
            Choice: 20, FourOfAKind: 24, FullHouse: 28, SmallStraight: 30, LargeStraight: 40, Yacht: 50
          },
          bonusScore: 0,
          totalScore: 237
        }
      ],
      currentDice: [1, 2, 3, 4, 5],
      rollCount: 1,
      turnHistory: [],
      currentTurnRolls: []
    };

    mockFirst.mockResolvedValue({
      state: JSON.stringify(mockGameState)
    });

    const body = JSON.stringify({
      type: 3,
      user: { id: "12345", username: "alice" },
      channel_id: "channel-777",
      data: {
        custom_id: "roll_00000"
      },
      message: {
        embeds: [{ title: "🎲 Yacht Dice Game", footer: { text: "Game ID: game-finished-123" } }]
      }
    });

    const req = await createSignedRequest(body);
    const res = await worker.fetch(req, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex }, {} as any);
    expect(res.status).toBe(200);

    const json = (await res.json()) as any;
    expect(json.type).toBe(7); // UpdateMessage (UI refresh)
    expect(json.data.components).toEqual([]); // Should be empty to clear stale buttons
    expect(json.data.embeds[0].description).toContain("🏆 **Game Finished!**");
  });

  it("should gracefully refresh game message and remove components when selecting category on finished game", async () => {
    const mockGameState = {
      gameId: "game-finished-123",
      mode: "single",
      status: "Finished",
      currentPlayerIndex: 0,
      players: [
        {
          playerId: "12345",
          playerName: "Alice",
          scoreBoard: {
            Aces: 3, Deuces: 6, Treys: 9, Fours: 12, Fives: 15, Sixes: 18,
            Choice: 20, FourOfAKind: 24, FullHouse: 28, SmallStraight: 30, LargeStraight: 40, Yacht: 50
          },
          bonusScore: 0,
          totalScore: 237
        }
      ],
      currentDice: [1, 2, 3, 4, 5],
      rollCount: 1,
      turnHistory: [],
      currentTurnRolls: []
    };

    mockFirst.mockResolvedValue({
      state: JSON.stringify(mockGameState)
    });

    const body = JSON.stringify({
      type: 3,
      user: { id: "12345", username: "alice" },
      channel_id: "channel-777",
      data: {
        custom_id: "select_category",
        values: ["Aces"]
      },
      message: {
        embeds: [{ title: "🎲 Yacht Dice Game", footer: { text: "Game ID: game-finished-123" } }]
      }
    });

    const req = await createSignedRequest(body);
    const res = await worker.fetch(req, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex }, {} as any);
    expect(res.status).toBe(200);

    const json = (await res.json()) as any;
    expect(json.type).toBe(7); // UpdateMessage (UI refresh)
    expect(json.data.components).toEqual([]); // Should be empty to clear stale dropdown
    expect(json.data.embeds[0].description).toContain("🏆 **Game Finished!**");
  });

  it("should block duplicate match and return forwarding link", async () => {
    const mockActiveGame = {
      gameId: "active-game-456",
      mode: "multi",
      status: "Rolling",
      initialMessageId: "msg-999",
      players: [
        { playerId: "12345", playerName: "Alice", scoreBoard: {}, bonusScore: 0, totalScore: 0 },
        { playerId: "67890", playerName: "Bob", scoreBoard: {}, bonusScore: 0, totalScore: 0 }
      ],
      currentDice: [1, 1, 1, 1, 1],
      rollCount: 0,
      turnHistory: [],
      currentTurnRolls: []
    };

    // Mock active game check query
    mockFirst.mockResolvedValue({
      state: JSON.stringify(mockActiveGame)
    });

    const body = JSON.stringify({
      type: 2,
      user: { id: "12345", username: "alice" },
      guild_id: "guild-123",
      channel_id: "channel-123",
      data: {
        name: "challenge",
        options: [
          { name: "opponent", value: "67890" }
        ],
        resolved: {
          users: {
            "67890": { id: "67890", username: "bob" }
          }
        }
      }
    });

    const req = await createSignedRequest(body);
    const res = await worker.fetch(req, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex }, {} as any);
    expect(res.status).toBe(200);

    const json = (await res.json()) as any;
    expect(json.type).toBe(4); // ChannelMessageWithSource
    expect(json.data.flags).toBe(64); // Ephemeral
    expect(json.data.content).toContain("이미 상대와 진행 중인 대전이 있습니다.");
    expect(json.data.content).toContain("https://discord.com/channels/guild-123/channel-123/msg-999");
  });

  it("should return ephemeral confirmation on surrender button click", async () => {
    const mockActiveGame = {
      gameId: "game-123",
      mode: "single",
      status: "Rolling",
      currentPlayerIndex: 0,
      players: [{ playerId: "12345", playerName: "Alice", scoreBoard: {}, bonusScore: 0, totalScore: 0 }],
      currentDice: [1, 1, 1, 1, 1],
      rollCount: 1,
      turnHistory: [],
      currentTurnRolls: []
    };

    mockFirst.mockResolvedValue({
      state: JSON.stringify(mockActiveGame)
    });

    const body = JSON.stringify({
      type: 3,
      user: { id: "12345", username: "alice" },
      data: {
        custom_id: "surrender"
      },
      message: {
        id: "msg-111",
        embeds: [{ title: "🎲 Yacht Dice Game", footer: { text: "Game ID: game-123" } }]
      }
    });

    const req = await createSignedRequest(body);
    const res = await worker.fetch(req, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex }, { waitUntil: () => {} } as any);
    expect(res.status).toBe(200);

    const json = (await res.json()) as any;
    expect(json.type).toBe(4); // ChannelMessageWithSource
    expect(json.data.flags).toBe(64); // Ephemeral
    expect(json.data.components[0].components[0].custom_id).toBe("confirm_surrender_game-123_msg-111");
  });

  it("should execute surrender and clean up active game on confirm_surrender click", async () => {
    const mockActiveGame = {
      gameId: "game-123",
      mode: "single",
      status: "Rolling",
      currentPlayerIndex: 0,
      players: [{ playerId: "12345", playerName: "Alice", scoreBoard: {}, bonusScore: 0, totalScore: 0 }],
      currentDice: [1, 1, 1, 1, 1],
      rollCount: 1,
      turnHistory: [],
      currentTurnRolls: []
    };

    mockFirst.mockResolvedValue({
      state: JSON.stringify(mockActiveGame)
    });

    const body = JSON.stringify({
      type: 3,
      user: { id: "12345", username: "alice" },
      data: {
        custom_id: "confirm_surrender_game-123_msg-111"
      },
      message: {
        embeds: [{ title: "🎲 Yacht Dice Game", footer: { text: "Game ID: game-123" } }]
      }
    });

    const req = await createSignedRequest(body);
    const res = await worker.fetch(req, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex }, { waitUntil: () => {} } as any);
    expect(res.status).toBe(200);

    const json = (await res.json()) as any;
    expect(json.type).toBe(7); // UpdateMessage (resolves the ephemeral confirmation)
    expect(json.data.content).toContain("기권 처리가 완료되었습니다.");

    // Verify D1 deletes active game and inserts matches record with surrendered_id
    expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining("DELETE FROM active_games"));
    expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO matches"));
  });

  it("should send celebration message on successful Yacht category selection", async () => {
    const mockActiveGame = {
      gameId: "game-123",
      mode: "single",
      status: "Scoring",
      currentPlayerIndex: 0,
      players: [{ playerId: "12345", playerName: "Alice", scoreBoard: {}, bonusScore: 0, totalScore: 0 }],
      currentDice: [6, 6, 6, 6, 6],
      rollCount: 1,
      turnHistory: [],
      currentTurnRolls: [[6, 6, 6, 6, 6]]
    };

    mockFirst.mockResolvedValue({
      state: JSON.stringify(mockActiveGame)
    });

    const originalFetch = global.fetch;
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "msg-celebrate-123" })
    });
    global.fetch = fetchSpy;

    const body = JSON.stringify({
      type: 3,
      user: { id: "12345", username: "alice" },
      channel_id: "channel-celebrate",
      data: {
        custom_id: "select_category",
        values: ["Yacht"]
      },
      message: {
        embeds: [{ title: "🎲 Yacht Dice Game", footer: { text: "Game ID: game-123" } }]
      }
    });

    const req = await createSignedRequest(body);
    const res = await worker.fetch(req, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex, DISCORD_BOT_TOKEN: "mock-token" }, { waitUntil: () => {} } as any);
    expect(res.status).toBe(200);

    // Wait a brief moment since it's background task
    await new Promise((resolve) => setTimeout(resolve, 50));

    const celebrationCall = fetchSpy.mock.calls.find(call => 
      call[0].includes("/channels/channel-celebrate/messages") && 
      call[1]?.method === "POST" &&
      (call[1]?.body?.includes("야추 확정") || call[1]?.body?.includes("확률 뚫음") || call[1]?.body?.includes("야추 완성") || call[1]?.body?.includes("야추 갓 등판"))
    );
    expect(celebrationCall).toBeDefined();

    global.fetch = originalFetch;
  });

  it("should send teasing message when Yacht is filled but rolls identical dice and scores elsewhere", async () => {
    const mockActiveGame = {
      gameId: "game-123",
      mode: "single",
      status: "Scoring",
      currentPlayerIndex: 0,
      players: [{ playerId: "12345", playerName: "Alice", scoreBoard: { Yacht: 0 }, bonusScore: 0, totalScore: 0 }],
      currentDice: [6, 6, 6, 6, 6],
      rollCount: 1,
      turnHistory: [],
      currentTurnRolls: [[6, 6, 6, 6, 6]]
    };

    mockFirst.mockResolvedValue({
      state: JSON.stringify(mockActiveGame)
    });

    const originalFetch = global.fetch;
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "msg-tease-123" })
    });
    global.fetch = fetchSpy;

    const body = JSON.stringify({
      type: 3,
      user: { id: "12345", username: "alice" },
      channel_id: "channel-tease",
      data: {
        custom_id: "select_category",
        values: ["Aces"]
      },
      message: {
        embeds: [{ title: "🎲 Yacht Dice Game", footer: { text: "Game ID: game-123" } }]
      }
    });

    const req = await createSignedRequest(body);
    const res = await worker.fetch(req, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex, DISCORD_BOT_TOKEN: "mock-token" }, { waitUntil: () => {} } as any);
    expect(res.status).toBe(200);

    await new Promise((resolve) => setTimeout(resolve, 50));

    const teasingCall = fetchSpy.mock.calls.find(call => 
      call[0].includes("/channels/channel-tease/messages") && 
      call[1]?.method === "POST" &&
      (call[1]?.body?.includes("칸 이미 죽어있음") || call[1]?.body?.includes("50점 그냥 버림") || call[1]?.body?.includes("소진") || call[1]?.body?.includes("다른 데 박음"))
    );
    expect(teasingCall).toBeDefined();

    global.fetch = originalFetch;
  });

  it("should handle component roll_ interaction, return rolling animation, and update board in background", async () => {
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
      rollCount: 1,
      turnHistory: [],
      currentTurnRolls: []
    };

    mockFirst.mockResolvedValue({
      state: JSON.stringify(mockGameState)
    });

    const originalFetch = global.fetch;
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
      text: async () => "{}"
    });
    global.fetch = fetchSpy;

    const body = JSON.stringify({
      type: 3,
      user: {
        id: "12345",
        username: "alice",
        global_name: "Alice"
      },
      data: {
        custom_id: "roll_00000"
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
    const ctx = {
      waitUntil: vi.fn((promise) => promise)
    };

    const res = await worker.fetch(
      req,
      { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex, DISCORD_BOT_TOKEN: "mock-bot-token" },
      ctx as any
    );
    expect(res.status).toBe(200);

    const json = (await res.json()) as any;
    expect(json.type).toBe(7); // UpdateMessage (Rolling animation)
    expect(json.data.embeds[0].description).toContain("Rolling the dice...");

    // Wait for background promise execution
    if (ctx.waitUntil.mock.calls.length > 0) {
      await Promise.all(ctx.waitUntil.mock.calls.map(call => call[0]));
    }

    // Verify background PATCH to discord webhook
    const patchCall = fetchSpy.mock.calls.find(call => 
      call[0].includes("/webhooks/") && 
      call[0].includes("/messages/@original") && 
      call[1]?.method === "PATCH"
    );
    expect(patchCall).toBeDefined();
    const patchBody = JSON.parse(patchCall[1].body);
    // Dice roll count should be incremented to 2
    expect(patchBody.embeds[0].description).toContain("**Rolls:** 2/3");

    global.fetch = originalFetch;
  });

  describe("Web Dashboard GET Routes", () => {
    it("should serve HTML dashboard at GET /", async () => {
      const req = new Request("http://localhost/", { method: "GET" });
      const res = await worker.fetch(req, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex }, { waitUntil: () => {} } as any);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/html");
      const text = await res.text();
      expect(text).toContain("야추 다이스");
    });

    it("should return 404 for unknown profile", async () => {
      const req = new Request("http://localhost/web/api/profile/unknown-id", { method: "GET" });
      const res = await worker.fetch(req, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex }, { waitUntil: () => {} } as any);
      expect(res.status).toBe(404);
    });

    it("should return registered players at GET /web/api/players", async () => {
      const mockPlayers = [
        { id: "123", name: "Alice", elo: 1200, multi_wins: 5, multi_losses: 2, solo_play_count: 0, solo_highest_score: 0, multi_draws: 0, multi_highest_score: 0, wins: 5, losses: 2, draws: 0, highest_score: 0, created_at: "2026-07-16T12:00:00Z", updated_at: "2026-07-16T12:00:00Z" }
      ];
      mockAll.mockResolvedValueOnce({
        results: mockPlayers
      });

      const req = new Request("http://localhost/web/api/players", { method: "GET" });
      const res = await worker.fetch(req, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex }, { waitUntil: () => {} } as any);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/json");
      const json = await res.json() as any;
      expect(json).toHaveLength(1);
      expect(json[0].name).toBe("Alice");
      expect(json[0].elo).toBe(1200);
    });
  });

  describe("Matchmaking & Invitation Integration Tests", () => {
    it("should handle /challenge with opponent to create pending invitation", async () => {
      const body = JSON.stringify({
        type: 2,
        application_id: "app123",
        token: "token123",
        data: {
          name: "challenge",
          options: [{ name: "opponent", value: "user456" }],
          resolved: {
            users: {
              user456: { username: "Bob", global_name: "BobGlobal" }
            }
          }
        },
        user: { id: "user123", username: "Alice" },
        guild_id: "guild1",
        channel_id: "channel1"
      });

      const req = await createSignedRequest(body);
      const res = await worker.fetch(req, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex }, { waitUntil: () => {} } as any);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.type).toBe(4);
      expect(json.data.embeds[0].title).toContain("야추 대결 초대장");
      expect(json.data.components[0].components[0].custom_id).toContain("invitation:accept:");
    });

    it("should handle /match to create open match queue", async () => {
      const body = JSON.stringify({
        type: 2,
        application_id: "app123",
        token: "token123",
        data: {
          name: "match"
        },
        user: { id: "user123", username: "Alice" },
        guild_id: "guild1",
        channel_id: "channel1"
      });

      const req = await createSignedRequest(body);
      const res = await worker.fetch(req, { DB: mockDB, DISCORD_PUBLIC_KEY: publicKeyHex }, { waitUntil: () => {} } as any);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.type).toBe(4);
      expect(json.data.embeds[0].title).toContain("야추 대결 공개 대기열");
      expect(json.data.components[0].components[0].custom_id).toContain("queue:join:");
    });
  });
});

