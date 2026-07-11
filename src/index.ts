import { Effect, Layer, Option } from "effect";
import { GameState, DiceHold, DiceRoll, ScoreCategory } from "./domain/types";
import { initGame, rollDice, selectCategory } from "./domain/game";
import { D1Database } from "./persistence/d1/database";
import { D1PlayerRepositoryLive, D1MatchRepositoryLive, D1GameRepositoryLive } from "./persistence/d1/repository";
import { PlayerRepository, MatchRepository, GameRepository } from "./persistence/repository";
import { DiscordSignatureVerifier, DiscordSignatureVerifierLive } from "./presentation/discord/adapter/signature";
import { DiscordInteractionParser, DiscordInteractionParserLive } from "./presentation/discord/adapter/parser";
import { DiscordResponseSerializer, DiscordResponseSerializerLive } from "./presentation/discord/adapter/serializer";

const randomDice = (): 1 | 2 | 3 | 4 | 5 | 6 =>
  (Math.floor(Math.random() * 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6;

const rollProvider: Effect.Effect<DiceRoll, never> = Effect.sync(() => [
  randomDice(),
  randomDice(),
  randomDice(),
  randomDice(),
  randomDice()
]);

const handleInteraction = (
  body: string,
  rawJson: any,
  interaction: any,
  ctx: any
) =>
  Effect.gen(function* () {
    const serializer = yield* DiscordResponseSerializer;
    const playerRepo = yield* PlayerRepository;
    const matchRepo = yield* MatchRepository;
    const gameRepo = yield* GameRepository;

    if (interaction._tag === "Ping") {
      return new Response(JSON.stringify({ type: 1 }), {
        headers: { "content-type": "application/json" }
      });
    }

    if (interaction._tag === "Command") {
      if (interaction.commandName === "challenge") {
        const opponentId = interaction.options.opponent;
        let opponentName = "Opponent";
        if (opponentId) {
          const resolvedUser = rawJson.data?.resolved?.users?.[opponentId];
          if (resolvedUser) {
            opponentName = resolvedUser.global_name || resolvedUser.username;
          }
        }

        const player1 = {
          playerId: interaction.user.id,
          playerName: interaction.user.globalName || interaction.user.username
        };

        const mode = opponentId ? "multi" : "single";
        const players = opponentId
          ? [
              player1,
              { playerId: opponentId, playerName: opponentName }
            ]
          : [player1];

        // Ensure players are upserted in the database
        yield* playerRepo.upsertPlayer(player1.playerId, player1.playerName);
        if (opponentId) {
          yield* playerRepo.upsertPlayer(opponentId, opponentName);
        }

        const gameState = yield* initGame(players, mode);
        yield* gameRepo.save(gameState);

        const serialized = serializer.serializeGame(gameState);
        // Force type to 4 (ChannelMessageWithSource) for initial slash command response
        const responsePayload = {
          ...serialized,
          type: 4
        };

        return new Response(JSON.stringify(responsePayload), {
          headers: { "content-type": "application/json" }
        });
      }

      if (interaction.commandName === "profile") {
        const statsOption = yield* playerRepo.getPlayer(interaction.user.id);
        const content = Option.isSome(statsOption)
          ? `👤 **Player Profile: ${interaction.user.globalName || interaction.user.username}**\n` +
            `• Wins: **${statsOption.value.wins}**\n` +
            `• Losses: **${statsOption.value.losses}**\n` +
            `• Draws: **${statsOption.value.draws}**\n` +
            `• Highest Score: **${statsOption.value.highestScore}**`
          : `👤 **Player Profile: ${interaction.user.globalName || interaction.user.username}**\n` +
            `No games played yet. Use \`/challenge\` to start your first game!`;

        const responsePayload = serializer.serializeMessage(content);
        return new Response(JSON.stringify(responsePayload), {
          headers: { "content-type": "application/json" }
        });
      }

      if (interaction.commandName === "leaderboard") {
        const topPlayers = yield* playerRepo.getLeaderboard(10);
        const responsePayload = serializer.serializeLeaderboard(topPlayers);
        return new Response(JSON.stringify(responsePayload), {
          headers: { "content-type": "application/json" }
        });
      }

      if (interaction.commandName === "history") {
        const gameIdOption = interaction.options.game_id;
        if (gameIdOption) {
          const matchOpt = yield* matchRepo.getMatchById(gameIdOption);
          if (Option.isNone(matchOpt)) {
            const responsePayload = serializer.serializeError(`Match not found: ${gameIdOption}`);
            return new Response(JSON.stringify(responsePayload), {
              headers: { "content-type": "application/json" }
            });
          }
          const responsePayload = serializer.serializeHistoryDetails(matchOpt.value, 1);
          const forcedResponse = {
            ...responsePayload,
            type: 4
          };
          return new Response(JSON.stringify(forcedResponse), {
            headers: { "content-type": "application/json" }
          });
        }

        const recentMatches = yield* matchRepo.getRecentMatches(interaction.user.id, 5);
        const responsePayload = serializer.serializeHistoryList(recentMatches, interaction.user.id);
        return new Response(JSON.stringify(responsePayload), {
          headers: { "content-type": "application/json" }
        });
      }

      return new Response(
        JSON.stringify(serializer.serializeError(`Unknown command: ${interaction.commandName}`)),
        { headers: { "content-type": "application/json" } }
      );
    }

    if (interaction._tag === "Component") {
      const customId = interaction.customId;

      if (customId === "backtohistorylist") {
        const recentMatches = yield* matchRepo.getRecentMatches(interaction.user.id, 5);
        const responsePayload = serializer.serializeHistoryList(recentMatches, interaction.user.id);
        const updatePayload = {
          ...responsePayload,
          type: 7 // UpdateMessage
        };
        return new Response(JSON.stringify(updatePayload), {
          headers: { "content-type": "application/json" }
        });
      }

      if (customId.startsWith("viewhistory_")) {
        const matchId = customId.split("_")[1];
        const matchOpt = yield* matchRepo.getMatchById(matchId);
        if (Option.isNone(matchOpt)) {
          return new Response(
            JSON.stringify(serializer.serializeError(`Match details not found: ${matchId}`)),
            { headers: { "content-type": "application/json" } }
          );
        }
        const responsePayload = serializer.serializeHistoryDetails(matchOpt.value, 1);
        return new Response(JSON.stringify(responsePayload), {
          headers: { "content-type": "application/json" }
        });
      }

      if (customId.startsWith("pagehistory_")) {
        const parts = customId.split("_");
        const matchId = parts[1];
        const page = parseInt(parts[2], 10) || 1;
        const matchOpt = yield* matchRepo.getMatchById(matchId);
        if (Option.isNone(matchOpt)) {
          return new Response(
            JSON.stringify(serializer.serializeError(`Match details not found: ${matchId}`)),
            { headers: { "content-type": "application/json" } }
          );
        }
        const responsePayload = serializer.serializeHistoryDetails(matchOpt.value, page);
        return new Response(JSON.stringify(responsePayload), {
          headers: { "content-type": "application/json" }
        });
      }

      const footerText = rawJson.message?.embeds?.[0]?.footer?.text || "";
      const gameIdMatch = footerText.match(/Game ID:\s*([a-zA-Z0-9]+)/);
      if (!gameIdMatch) {
        return new Response(
          JSON.stringify(serializer.serializeError("Game ID not found in message")),
          { headers: { "content-type": "application/json" } }
        );
      }
      const gameId = gameIdMatch[1];

      const gameStateOption = yield* gameRepo.findById(gameId);
      if (Option.isNone(gameStateOption)) {
        return new Response(
          JSON.stringify(serializer.serializeError(`Game not found: ${gameId}`)),
          { headers: { "content-type": "application/json" } }
        );
      }
      const gameState = gameStateOption.value;

      // Validate turn
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      if (currentPlayer.playerId !== interaction.user.id) {
        return new Response(
          JSON.stringify({
            type: 4,
            data: {
              content: `❌ It's not your turn! Current turn: <@${currentPlayer.playerId}>`,
              flags: 64
            }
          }),
          { headers: { "content-type": "application/json" } }
        );
      }
      if (customId.startsWith("hold_")) {
        // Format: hold_${idx}_${newHolds}
        const parts = customId.split("_");
        const newHolds = parts[2];
        const responsePayload = serializer.serializeGame(gameState, newHolds);
        return new Response(JSON.stringify(responsePayload), {
          headers: { "content-type": "application/json" }
        });
      }

      if (customId.startsWith("roll_")) {
        // Format: roll_${holds}
        const parts = customId.split("_");
        const holds = parts[1] || "00000";
        const holdsTuple = holds.split("").map((h: string) => h === "1") as unknown as DiceHold;

        const nextState = yield* rollDice(gameState, holdsTuple, rollProvider);
        yield* gameRepo.save(nextState);

        const rollingPayload = serializer.serializeRolling(gameState, holds);

        ctx.waitUntil(
          Effect.runPromise(
            Effect.gen(function* () {
              yield* Effect.sleep("1.4 seconds");
              const finalPayload = serializer.serializeGame(nextState, holds);
              
              yield* Effect.tryPromise({
                try: () =>
                  fetch(`https://discord.com/api/v10/webhooks/${interaction.applicationId}/${interaction.token}/messages/@original`, {
                    method: "PATCH",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(finalPayload.data)
                  }),
                catch: (error) => new Error(`Failed to update interaction response: ${error}`)
              });
            }).pipe(
              Effect.catchAll((error) => {
                console.error("Error in background dice rolling task:", error);
                return Effect.void;
              })
            )
          )
        );

        return new Response(JSON.stringify(rollingPayload), {
          headers: { "content-type": "application/json" }
        });
      }

      if (customId === "select_category") {
        const category = interaction.values?.[0] as ScoreCategory;
        if (!category) {
          return new Response(
            JSON.stringify(serializer.serializeError("No category selected")),
            { headers: { "content-type": "application/json" } }
          );
        }

        const nextState = yield* selectCategory(gameState, category);

        if (nextState.status === "Finished") {
          // Save match
          const matchId = nextState.gameId;
          const mode = nextState.mode;
          const p1 = nextState.players[0];
          const p2 = nextState.mode === "multi" ? nextState.players[1] : null;

          let winnerId: string | null = null;
          if (mode === "multi" && p2) {
            if (p1.totalScore > p2.totalScore) {
              winnerId = p1.playerId;
            } else if (p2.totalScore > p1.totalScore) {
              winnerId = p2.playerId;
            }
          } else {
            winnerId = p1.playerId;
          }

          const matchRecord = {
            id: matchId,
            mode,
            player1Id: p1.playerId,
            player2Id: p2 ? p2.playerId : null,
            player1Score: p1.totalScore,
            player2Score: p2 ? p2.totalScore : null,
            winnerId,
            playedAt: new Date(),
            historyJson: JSON.stringify(nextState.turnHistory)
          };

          yield* matchRepo.saveMatch(matchRecord);

          // Update stats
          if (mode === "single") {
            yield* playerRepo.updateStats(p1.playerId, "win", p1.totalScore);
          } else if (p2) {
            if (p1.totalScore > p2.totalScore) {
              yield* playerRepo.updateStats(p1.playerId, "win", p1.totalScore);
              yield* playerRepo.updateStats(p2.playerId, "loss", p2.totalScore);
            } else if (p2.totalScore > p1.totalScore) {
              yield* playerRepo.updateStats(p1.playerId, "loss", p1.totalScore);
              yield* playerRepo.updateStats(p2.playerId, "win", p2.totalScore);
            } else {
              yield* playerRepo.updateStats(p1.playerId, "draw", p1.totalScore);
              yield* playerRepo.updateStats(p2.playerId, "draw", p2.totalScore);
            }
          }
        }

        yield* gameRepo.save(nextState);

        const responsePayload = serializer.serializeGame(nextState);
        return new Response(JSON.stringify(responsePayload), {
          headers: { "content-type": "application/json" }
        });
      }

      return new Response(
        JSON.stringify(serializer.serializeError(`Unknown custom_id: ${customId}`)),
        { headers: { "content-type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(serializer.serializeError("Unsupported interaction")),
      { headers: { "content-type": "application/json" } }
    );
  });

export default {
  async fetch(request: Request, env: { DB: D1Database; DISCORD_PUBLIC_KEY: string }, ctx: any): Promise<Response> {
    const signature = request.headers.get("x-signature-ed25519") || "";
    const timestamp = request.headers.get("x-signature-timestamp") || "";

    if (!signature || !timestamp) {
      return new Response("Missing signature headers", { status: 401 });
    }

    const body = await request.text();
    const publicKey = env.DISCORD_PUBLIC_KEY;
    if (!publicKey) {
      return new Response("DISCORD_PUBLIC_KEY is not configured", { status: 500 });
    }

    const program = Effect.gen(function* () {
      const verifier = yield* DiscordSignatureVerifier;
      const parser = yield* DiscordInteractionParser;

      const isVerified = yield* verifier.verify(body, signature, timestamp, publicKey);
      if (!isVerified) {
        return yield* Effect.fail({ _tag: "Unauthorized" as const, message: "Invalid signature" });
      }

      let rawJson;
      try {
        rawJson = JSON.parse(body);
      } catch (e) {
        return yield* Effect.fail({ _tag: "BadRequest" as const, message: "Invalid JSON body" });
      }

      const interaction = yield* parser.parse(body);
      return yield* handleInteraction(body, rawJson, interaction, ctx);
    });

    const mainLayer = Layer.mergeAll(
      DiscordSignatureVerifierLive,
      DiscordInteractionParserLive,
      DiscordResponseSerializerLive,
      D1PlayerRepositoryLive,
      D1MatchRepositoryLive,
      D1GameRepositoryLive
    ).pipe(
      Layer.provide(Layer.succeed(D1Database, env.DB))
    );

    const runnable = program.pipe(
      Effect.catchTag("Unauthorized", (err) =>
        Effect.succeed(new Response(err.message, { status: 401 }))
      ),
      Effect.catchTag("BadRequest", (err) =>
        Effect.succeed(new Response(err.message, { status: 400 }))
      ),
      Effect.catchAll((err) => {
        const message = err && typeof err === "object" && "message" in err ? (err as any).message : String(err);
        const errorPayload = {
          type: 4,
          data: {
            content: `❌ **Error:** ${message}`,
            flags: 64
          }
        };
        return Effect.succeed(
          new Response(JSON.stringify(errorPayload), {
            headers: { "content-type": "application/json" }
          })
        );
      }),
      Effect.provide(mainLayer)
    );

    return Effect.runPromise(runnable);
  }
};
