import { Effect, Layer, Option } from "effect";
import { GameState, DiceHold, DiceRoll, ScoreCategory } from "./domain/types";
import { initGame, rollDice, selectCategory, surrenderGame } from "./domain/game";
import { calculateScore } from "./domain/score";
import { calculateEloChange } from "./domain/elo";
import { InvalidStateActionError } from "./domain/errors";
import { D1Database } from "./persistence/d1/database";
import { D1PlayerRepositoryLive, D1MatchRepositoryLive, D1GameRepositoryLive } from "./persistence/d1/repository";
import { PlayerRepository, MatchRepository, GameRepository } from "./persistence/repository";
import { DiscordSignatureVerifier, DiscordSignatureVerifierLive } from "./presentation/discord/adapter/signature";
import { DiscordInteractionParser, DiscordInteractionParserLive } from "./presentation/discord/adapter/parser";
import { DiscordResponseSerializer, DiscordResponseSerializerLive } from "./presentation/discord/adapter/serializer";
import { DiscordApiService, DiscordApiServiceLive, DiscordBotToken } from "./presentation/discord/adapter/api";

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

    const handleGameEnd = (nextState: GameState) =>
      Effect.gen(function* () {
        const matchId = nextState.gameId;
        const mode = nextState.mode;
        const p1 = nextState.players[0];
        const p2 = nextState.mode === "multi" ? nextState.players[1] : null;

        let winnerId: string | null = null;
        if (nextState.surrenderedPlayerId) {
          if (mode === "multi" && p2) {
            winnerId = nextState.surrenderedPlayerId === p1.playerId ? p2.playerId : p1.playerId;
          } else {
            winnerId = null;
          }
        } else {
          if (mode === "multi" && p2) {
            if (p1.totalScore > p2.totalScore) {
              winnerId = p1.playerId;
            } else if (p2.totalScore > p1.totalScore) {
              winnerId = p2.playerId;
            }
          } else {
            winnerId = p1.playerId;
          }
        }

        const matchRecord = {
          id: matchId,
          mode,
          guildId: interaction.guildId,
          player1Id: p1.playerId,
          player2Id: p2 ? p2.playerId : null,
          player1Score: p1.totalScore,
          player2Score: p2 ? p2.totalScore : null,
          winnerId,
          playedAt: new Date(),
          historyJson: JSON.stringify(nextState.turnHistory)
        };

        yield* matchRepo.saveMatch(matchRecord);
        yield* Effect.logInfo(`Game finished. Winner: ${winnerId || "Draw"}. Match record saved to D1.`);

        let endMsgContent = "";

        // Update stats
        if (mode === "single") {
          yield* playerRepo.updateStats(p1.playerId, interaction.guildId, "single", "win", p1.totalScore);
          yield* Effect.logInfo(`Updated stats for Player 1: ${p1.playerId} (single)`);

          if (nextState.surrenderedPlayerId) {
            endMsgContent = `🏳️ 항복! <@${p1.playerId}> 님이 게임을 기권하였습니다. 최종 스코어: **${p1.totalScore}**점`;
          } else {
            endMsgContent = `🏁 게임 완료! <@${p1.playerId}> 님의 최종 스코어: **${p1.totalScore}**점`;
          }
        } else if (p2) {
          // Retrieve current Elo ratings
          const p1StatsOption = yield* playerRepo.getPlayer(p1.playerId, interaction.guildId);
          const p2StatsOption = yield* playerRepo.getPlayer(p2.playerId, interaction.guildId);
          const p1Elo = Option.isSome(p1StatsOption) ? p1StatsOption.value.elo : 1000;
          const p2Elo = Option.isSome(p2StatsOption) ? p2StatsOption.value.elo : 1000;

          let outcome: number;
          if (nextState.surrenderedPlayerId) {
            outcome = nextState.surrenderedPlayerId === p1.playerId ? 0 : 1;
          } else {
            outcome = p1.totalScore > p2.totalScore ? 1 : (p2.totalScore > p1.totalScore ? 0 : 0.5);
          }
          const eloResult = calculateEloChange(p1Elo, p2Elo, outcome);

          // Update Elo
          yield* playerRepo.updateElo(p1.playerId, interaction.guildId, eloResult.newRatingA);
          yield* playerRepo.updateElo(p2.playerId, interaction.guildId, eloResult.newRatingB);
          yield* Effect.logInfo(`Updated Elo ratings. P1: ${eloResult.newRatingA}, P2: ${eloResult.newRatingB}`);

          // Update other stats
          if (nextState.surrenderedPlayerId) {
            if (nextState.surrenderedPlayerId === p1.playerId) {
              yield* playerRepo.updateStats(p1.playerId, interaction.guildId, "multi", "loss", p1.totalScore);
              yield* playerRepo.updateStats(p2.playerId, interaction.guildId, "multi", "win", p2.totalScore);
            } else {
              yield* playerRepo.updateStats(p1.playerId, interaction.guildId, "multi", "win", p1.totalScore);
              yield* playerRepo.updateStats(p2.playerId, interaction.guildId, "multi", "loss", p2.totalScore);
            }
          } else {
            if (p1.totalScore > p2.totalScore) {
              yield* playerRepo.updateStats(p1.playerId, interaction.guildId, "multi", "win", p1.totalScore);
              yield* playerRepo.updateStats(p2.playerId, interaction.guildId, "multi", "loss", p2.totalScore);
            } else if (p2.totalScore > p1.totalScore) {
              yield* playerRepo.updateStats(p1.playerId, interaction.guildId, "multi", "loss", p1.totalScore);
              yield* playerRepo.updateStats(p2.playerId, interaction.guildId, "multi", "win", p2.totalScore);
            } else {
              yield* playerRepo.updateStats(p1.playerId, interaction.guildId, "multi", "draw", p1.totalScore);
              yield* playerRepo.updateStats(p2.playerId, interaction.guildId, "multi", "draw", p2.totalScore);
            }
          }
          yield* Effect.logInfo(`Updated stats for Player 1: ${p1.playerId} and Player 2: ${p2.playerId} (multi)`);

          const formatDelta = (d: number) => d >= 0 ? `▲+${d}` : `▼${d}`;
          if (nextState.surrenderedPlayerId) {
            const surrenderedPlayer = nextState.players.find(p => p.playerId === nextState.surrenderedPlayerId);
            const winningPlayer = nextState.players.find(p => p.playerId !== nextState.surrenderedPlayerId);
            if (winningPlayer && surrenderedPlayer) {
              endMsgContent = `🏳️ <@${surrenderedPlayer.playerId}> 님이 항복하여 <@${winningPlayer.playerId}> 님이 승리했습니다!\n• <@${p1.playerId}>: Elo **${eloResult.newRatingA}** (${formatDelta(eloResult.deltaA)})\n• <@${p2.playerId}>: Elo **${eloResult.newRatingB}** (${formatDelta(eloResult.deltaB)})`;
            }
          } else {
            if (p1.totalScore > p2.totalScore) {
              endMsgContent = `🎉🏆 <@${p1.playerId}> 님이 승리했습니다! **${p1.totalScore}**점 대 **${p2.totalScore}**점! GG! 🎲\n• <@${p1.playerId}>: Elo **${eloResult.newRatingA}** (${formatDelta(eloResult.deltaA)})\n• <@${p2.playerId}>: Elo **${eloResult.newRatingB}** (${formatDelta(eloResult.deltaB)})`;
            } else if (p2.totalScore > p1.totalScore) {
              endMsgContent = `🎉🏆 <@${p2.playerId}> 님이 승리했습니다! **${p2.totalScore}**점 대 **${p1.totalScore}**점! GG! 🎲\n• <@${p1.playerId}>: Elo **${eloResult.newRatingA}** (${formatDelta(eloResult.deltaA)})\n• <@${p2.playerId}>: Elo **${eloResult.newRatingB}** (${formatDelta(eloResult.deltaB)})`;
            } else {
              endMsgContent = `🤝 무승부! <@${p1.playerId}> vs <@${p2.playerId}> - **${p1.totalScore}**점으로 동점!\n• <@${p1.playerId}>: Elo **${eloResult.newRatingA}** (${formatDelta(eloResult.deltaA)})\n• <@${p2.playerId}>: Elo **${eloResult.newRatingB}** (${formatDelta(eloResult.deltaB)})`;
            }
          }
        }

        // Send game end notification message in background
        const apiService = yield* DiscordApiService;
        const replyToMessageId = rawJson.message?.id;
        if (interaction.channelId && endMsgContent) {
          const endMessageTask = apiService.sendGameEndMessage(interaction.channelId, endMsgContent, replyToMessageId).pipe(
            Effect.catchAll((err) => Effect.logError(`Error sending game end message: ${err}`))
          );
          ctx.waitUntil(Effect.runPromise(endMessageTask));
        }
      });

    if (interaction._tag === "Ping") {
      return new Response(JSON.stringify({ type: 1 }), {
        headers: { "content-type": "application/json" }
      });
    }

    if (interaction._tag === "Command") {
      if (interaction.commandName === "challenge") {
        const opponentId = interaction.options.opponent;
        if (opponentId && opponentId === interaction.user.id) {
          return new Response(
            JSON.stringify({
              type: 4,
              data: {
                content: "❌ 자기 자신에게는 도전할 수 없습니다! 싱글 모드로 플레이하거나 다른 대상을 지정해 주세요.",
                flags: 64
              }
            }),
            { headers: { "content-type": "application/json" } }
          );
        }

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

        yield* Effect.logInfo(`Match initialized. Mode: ${mode}, Players: ${players.map(p => p.playerId).join(", ")}`);

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
        const statsOption = yield* playerRepo.getPlayer(interaction.user.id, interaction.guildId);
        const content = Option.isSome(statsOption)
          ? `👤 **Player Profile: ${interaction.user.globalName || interaction.user.username}**\n\n` +
            `🎮 **Solo Mode**\n` +
            `• Games Played: **${statsOption.value.soloPlayCount}**\n` +
            `• Highest Score: **${statsOption.value.soloHighestScore}**\n\n` +
            `⚔️ **Matching Mode (VS)**\n` +
            `• Elo Rating: **${statsOption.value.elo}**\n` +
            `• Wins: **${statsOption.value.multiWins}**\n` +
            `• Losses: **${statsOption.value.multiLosses}**\n` +
            `• Draws: **${statsOption.value.multiDraws}**\n` +
            `• Highest Score: **${statsOption.value.multiHighestScore}**`
          : `👤 **Player Profile: ${interaction.user.globalName || interaction.user.username}**\n\n` +
            `No games played yet. Use \`/challenge\` to start your first game!`;

        const responsePayload = serializer.serializeMessage(content);
        return new Response(JSON.stringify(responsePayload), {
          headers: { "content-type": "application/json" }
        });
      }

      if (interaction.commandName === "leaderboard") {
        const mode = (interaction.options.type === "solo" ? "single" : "multi") as "single" | "multi";
        const topPlayers = yield* playerRepo.getLeaderboard(mode, interaction.guildId, 10);
        const responsePayload = serializer.serializeLeaderboard(topPlayers, mode);
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

        const recentMatches = yield* matchRepo.getRecentMatches(interaction.user.id, interaction.guildId, 5);
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
        const recentMatches = yield* matchRepo.getRecentMatches(interaction.user.id, interaction.guildId, 5);
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

      // Handle surrender
      if (customId === "surrender") {
        const isPlayerInGame = gameState.players.some((p) => p.playerId === interaction.user.id);
        if (!isPlayerInGame) {
          return new Response(
            JSON.stringify({
              type: 4,
              data: {
                content: `❌ You are not a player in this game!`,
                flags: 64
              }
            }),
            { headers: { "content-type": "application/json" } }
          );
        }

        if (gameState.status === "Finished") {
          yield* Effect.logInfo("Ignore surrender action. Game is already finished.");
          const responsePayload = serializer.serializeGame(gameState);
          return new Response(JSON.stringify(responsePayload), {
            headers: { "content-type": "application/json" }
          });
        }

        const nextState = yield* surrenderGame(gameState, interaction.user.id);
        yield* gameRepo.save(nextState);
        yield* Effect.logInfo(`Player ${interaction.user.id} surrendered game ${gameId}`);

        // Delete mention on action
        const apiService = yield* DiscordApiService;
        if (gameState.lastMentionMessageId && gameState.lastMentionChannelId) {
          const deleteMentionTask = apiService.deleteMessage(gameState.lastMentionChannelId, gameState.lastMentionMessageId).pipe(
            Effect.catchAll(() => Effect.void),
            Effect.annotateLogs("userId", interaction.user.id),
            Effect.annotateLogs("guildId", interaction.guildId || "DM"),
            Effect.annotateLogs("actionType", interaction._tag),
            Effect.annotateLogs("actionName", interaction.customId),
            Effect.annotateLogs("gameId", gameState.gameId)
          );
          ctx.waitUntil(Effect.runPromise(deleteMentionTask));
        }

        yield* handleGameEnd(nextState);

        const responsePayload = serializer.serializeGame(nextState);
        return new Response(JSON.stringify(responsePayload), {
          headers: { "content-type": "application/json" }
        });
      }

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

        yield* Effect.logInfo(`Dice hold state updated: ${newHolds}`);

        // Delete mention on action
        const apiService = yield* DiscordApiService;
        if (gameState.lastMentionMessageId && gameState.lastMentionChannelId) {
          const deleteMentionTask = apiService.deleteMessage(gameState.lastMentionChannelId, gameState.lastMentionMessageId).pipe(
            Effect.catchAll(() => Effect.void),
            Effect.annotateLogs("userId", interaction.user.id),
            Effect.annotateLogs("guildId", interaction.guildId || "DM"),
            Effect.annotateLogs("actionType", interaction._tag),
            Effect.annotateLogs("actionName", interaction.customId),
            Effect.annotateLogs("gameId", gameState.gameId)
          );
          ctx.waitUntil(Effect.runPromise(deleteMentionTask));

          const nextState = {
            ...gameState,
            lastMentionMessageId: undefined,
            lastMentionChannelId: undefined
          };
          yield* gameRepo.save(nextState);
        }

        return new Response(JSON.stringify(responsePayload), {
          headers: { "content-type": "application/json" }
        });
      }

      if (customId.startsWith("roll_")) {
        // Format: roll_${holds}
        const parts = customId.split("_");
        const holds = parts[1] || "00000";
        const holdsTuple = holds.split("").map((h: string) => h === "1") as unknown as DiceHold;

        // If the game was already finished (stale button click recovered)
        if (gameState.status === "Finished") {
          yield* Effect.logInfo("Ignore roll action. Game is already finished.");
          const finalPayload = serializer.serializeGame(gameState, holds);
          return new Response(JSON.stringify(finalPayload), {
            headers: { "content-type": "application/json" }
          });
        }

        const rollResult = rollDice(gameState, holdsTuple, rollProvider).pipe(
          Effect.catchTag("AllDiceHeldError", () =>
            Effect.fail(new InvalidStateActionError("모든 주사위가 홀드된 상태에서는 굴릴 수 없습니다. 주사위 홀드를 일부 해제하거나 점수를 기록해 주세요."))
          )
        );
        const nextStateRaw = yield* rollResult;
        const nextState = {
          ...nextStateRaw,
          lastMentionMessageId: undefined,
          lastMentionChannelId: undefined
        };
        yield* gameRepo.save(nextState);

        yield* Effect.logInfo(`Dice rolled. Roll count: ${nextState.rollCount}/3, holds: ${holds}, result: [${nextState.currentDice.join(", ")}]`);

        // Delete mention on action
        const apiService = yield* DiscordApiService;
        if (gameState.lastMentionMessageId && gameState.lastMentionChannelId) {
          const deleteMentionTask = apiService.deleteMessage(gameState.lastMentionChannelId, gameState.lastMentionMessageId).pipe(
            Effect.catchAll(() => Effect.void),
            Effect.annotateLogs("userId", interaction.user.id),
            Effect.annotateLogs("guildId", interaction.guildId || "DM"),
            Effect.annotateLogs("actionType", interaction._tag),
            Effect.annotateLogs("actionName", interaction.customId),
            Effect.annotateLogs("gameId", gameState.gameId)
          );
          ctx.waitUntil(Effect.runPromise(deleteMentionTask));
        }

        const rollingPayload = serializer.serializeRolling(gameState, holds);

        const rollBgTask = Effect.gen(function* () {
          yield* Effect.sleep("1.2 seconds");
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
          Effect.catchAll((error) => 
            Effect.logError(`Error in background dice rolling task: ${error}`)
          ),
          Effect.annotateLogs("userId", interaction.user.id),
          Effect.annotateLogs("guildId", interaction.guildId || "DM"),
          Effect.annotateLogs("actionType", interaction._tag),
          Effect.annotateLogs("actionName", interaction.customId),
          Effect.annotateLogs("gameId", nextState.gameId)
        );
        ctx.waitUntil(Effect.runPromise(rollBgTask));

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

        // If the game was already finished (stale dropdown click recovered)
        if (gameState.status === "Finished") {
          yield* Effect.logInfo("Ignore category selection. Game is already finished.");
          const responsePayload = serializer.serializeGame(gameState);
          return new Response(JSON.stringify(responsePayload), {
            headers: { "content-type": "application/json" }
          });
        }

        const scoredPoints = calculateScore(category, gameState.currentDice);
        yield* Effect.logInfo(`Category selected: ${category}, Points scored: ${scoredPoints}`);

        const nextState = yield* selectCategory(gameState, category);

        if (nextState.status === "Finished") {
          yield* handleGameEnd(nextState);
        }

        yield* gameRepo.save(nextState);

        // Turn mention notification
        const channelId = interaction.channelId;
        const apiService = yield* DiscordApiService;
        if (nextState.mode === "multi" && nextState.status !== "Finished" && channelId) {
          const nextPlayerId = nextState.players[nextState.currentPlayerIndex].playerId;
          const sendMentionTask = Effect.gen(function* () {
            if (gameState.lastMentionMessageId && gameState.lastMentionChannelId) {
              yield* apiService.deleteMessage(gameState.lastMentionChannelId, gameState.lastMentionMessageId);
            }
            const newMsgId = yield* apiService.sendMention(channelId, nextPlayerId, rawJson.message?.id);
            if (newMsgId) {
              const stateWithMention = {
                ...nextState,
                lastMentionMessageId: newMsgId,
                lastMentionChannelId: channelId
              };
              yield* gameRepo.save(stateWithMention);
            }
          }).pipe(
            Effect.catchAll((err) => 
              Effect.logError(`Error sending turn mention: ${err}`)
            ),
            Effect.annotateLogs("userId", interaction.user.id),
            Effect.annotateLogs("guildId", interaction.guildId || "DM"),
            Effect.annotateLogs("actionType", interaction._tag),
            Effect.annotateLogs("actionName", interaction.customId),
            Effect.annotateLogs("gameId", nextState.gameId)
          );
          ctx.waitUntil(Effect.runPromise(sendMentionTask));
        } else {
          if (gameState.lastMentionMessageId && gameState.lastMentionChannelId) {
            const deleteMentionTask = apiService.deleteMessage(gameState.lastMentionChannelId, gameState.lastMentionMessageId).pipe(
              Effect.catchAll(() => Effect.void),
              Effect.annotateLogs("userId", interaction.user.id),
              Effect.annotateLogs("guildId", interaction.guildId || "DM"),
              Effect.annotateLogs("actionType", interaction._tag),
              Effect.annotateLogs("actionName", interaction.customId),
              Effect.annotateLogs("gameId", nextState.gameId)
            );
            ctx.waitUntil(Effect.runPromise(deleteMentionTask));
          }
        }

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
  async fetch(request: Request, env: { DB: D1Database; DISCORD_PUBLIC_KEY: string; DISCORD_BOT_TOKEN?: string }, ctx: any): Promise<Response> {
    const signature = request.headers.get("x-signature-ed25519") || "";
    const timestamp = request.headers.get("x-signature-timestamp") || "";

    const program = Effect.gen(function* () {
      const verifier = yield* DiscordSignatureVerifier;
      const parser = yield* DiscordInteractionParser;

      if (!signature || !timestamp) {
        return yield* Effect.fail({ _tag: "Unauthorized" as const, message: "Missing signature headers" });
      }

      const body = yield* Effect.promise(() => request.text());
      const publicKey = env.DISCORD_PUBLIC_KEY;
      if (!publicKey) {
        return yield* Effect.fail({ _tag: "InternalError" as const, message: "DISCORD_PUBLIC_KEY is not configured" });
      }

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

      let annotated = handleInteraction(body, rawJson, interaction, ctx);

      if (interaction._tag !== "Ping") {
        const userId = interaction.user.id;
        const guildId = interaction.guildId || "DM";
        const actionType = interaction._tag;
        const actionName = interaction._tag === "Command" ? interaction.commandName : interaction.customId;

        const gameId = (interaction._tag === "Component")
          ? (rawJson.message?.embeds?.[0]?.footer?.text || "").match(/Game ID:\s*([a-zA-Z0-9]+)/)?.[1]
          : undefined;

        annotated = annotated.pipe(
          Effect.annotateLogs("userId", userId),
          Effect.annotateLogs("guildId", guildId),
          Effect.annotateLogs("actionType", actionType),
          Effect.annotateLogs("actionName", actionName)
        );

        if (gameId) {
          annotated = annotated.pipe(
            Effect.annotateLogs("gameId", gameId)
          );
        }
      }

      return yield* annotated;
    });

    const botTokenLayer = Layer.succeed(DiscordBotToken, env.DISCORD_BOT_TOKEN || "");
    const apiServiceLayer = DiscordApiServiceLive.pipe(Layer.provide(botTokenLayer));

    const mainLayer = Layer.mergeAll(
      DiscordSignatureVerifierLive,
      DiscordInteractionParserLive,
      DiscordResponseSerializerLive,
      D1PlayerRepositoryLive,
      D1MatchRepositoryLive,
      D1GameRepositoryLive,
      apiServiceLayer
    ).pipe(
      Layer.provide(Layer.succeed(D1Database, env.DB))
    );

    const runnable = program.pipe(
      Effect.catchTag("Unauthorized", (err) =>
        Effect.gen(function* () {
          yield* Effect.logWarning(`Unauthorized request: ${err.message}`);
          return new Response(err.message, { status: 401 });
        })
      ),
      Effect.catchTag("BadRequest", (err) =>
        Effect.gen(function* () {
          yield* Effect.logWarning(`Bad request: ${err.message}`);
          return new Response(err.message, { status: 400 });
        })
      ),
      Effect.catchTag("ParseError", (err) =>
        Effect.gen(function* () {
          yield* Effect.logWarning(`Failed to parse interaction: ${err.message}`);
          return new Response(err.message, { status: 400 });
        })
      ),
      Effect.catchAll((err) =>
        Effect.gen(function* () {
          const message = err && typeof err === "object" && "message" in err ? (err as any).message : String(err);
          const stack = err && typeof err === "object" && "stack" in err ? (err as any).stack : undefined;
          yield* Effect.logError(`Unhandled error occurred: ${message}${stack ? `\n${stack}` : ""}`);
          const errorPayload = {
            type: 4,
            data: {
              content: `❌ **Error:** ${message}`,
              flags: 64
            }
          };
          return new Response(JSON.stringify(errorPayload), {
            headers: { "content-type": "application/json" }
          });
        })
      ),
      Effect.provide(mainLayer)
    );

    return Effect.runPromise(runnable);
  }
};
