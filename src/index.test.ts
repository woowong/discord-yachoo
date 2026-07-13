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
});
