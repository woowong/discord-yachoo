import { Effect, Option } from "effect";
import { ParsedInteraction } from "../../discord/adapter/types";
import { PlayerRepository, MatchRepository } from "../../../persistence/repository";
import { DiscordResponseSerializer } from "../../discord/adapter/serializer";
import { GameWorkflowService } from "../../../application/GameWorkflowService";
import { KoreanMessages } from "../../messages/ko";

export const handleChallenge = (
  interaction: ParsedInteraction & { readonly _tag: "Command" },
  rawJson: any,
  safeCtx: any
) =>
  Effect.gen(function* () {
    const workflow = yield* GameWorkflowService;
    const serializer = yield* DiscordResponseSerializer;

    const opponentId = interaction.options.opponent;
    if (opponentId && opponentId === interaction.user.id) {
      return new Response(
        JSON.stringify({
          type: 4,
          data: {
            content: KoreanMessages.errors.selfChallenge,
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

    const challengerId = interaction.user.id;
    const challengerName = interaction.user.globalName || interaction.user.username;
    const guildId = interaction.guildId || "@me";
    const channelId = interaction.channelId || "";

    if (opponentId) {
      // Direct challenge invitation
      const invResult = workflow.createInvitation(
        challengerId,
        challengerName,
        opponentId,
        opponentName,
        guildId,
        channelId
      ).pipe(
        Effect.catchTag("ActiveGameExistsError", (err) =>
          Effect.succeed(
            new Response(
              JSON.stringify({
                type: 4,
                data: {
                  content: err.message,
                  flags: 64
                }
              }),
              { headers: { "content-type": "application/json" } }
            )
          )
        ),
        Effect.catchTag("ActiveInvitationExistsError", (err) =>
          Effect.succeed(
            new Response(
              JSON.stringify({
                type: 4,
                data: {
                  content: err.message,
                  flags: 64
                }
              }),
              { headers: { "content-type": "application/json" } }
            )
          )
        )
      );

      const resOrInv = yield* invResult;
      if (resOrInv instanceof Response) {
        return resOrInv;
      }

      const serialized = serializer.serializeInvitation(resOrInv);
      return new Response(JSON.stringify(serialized), {
        headers: { "content-type": "application/json" }
      });
    }

    const challengeResult = workflow.challenge(
      challengerId,
      challengerName,
      undefined,
      undefined,
      guildId,
      channelId,
      interaction.applicationId,
      interaction.token,
      safeCtx
    ).pipe(
      Effect.catchTag("ActiveGameExistsError", (err) =>
        Effect.succeed(
          new Response(
            JSON.stringify({
              type: 4,
              data: {
                content: err.message,
                flags: 64
              }
            }),
            { headers: { "content-type": "application/json" } }
          )
        )
      )
    );

    const responseOrState = yield* challengeResult;
    if (responseOrState instanceof Response) {
      return responseOrState;
    }

    const serialized = serializer.serializeGame(responseOrState);
    const responsePayload = {
      ...serialized,
      type: 4
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { "content-type": "application/json" }
    });
  });

export const handleMatch = (
  interaction: ParsedInteraction & { readonly _tag: "Command" }
) =>
  Effect.gen(function* () {
    const workflow = yield* GameWorkflowService;
    const serializer = yield* DiscordResponseSerializer;

    const hostId = interaction.user.id;
    const hostName = interaction.user.globalName || interaction.user.username;
    const guildId = interaction.guildId || "@me";
    const channelId = interaction.channelId || "";

    const queueResult = workflow.createMatchQueue(
      hostId,
      hostName,
      guildId,
      channelId
    ).pipe(
      Effect.catchTag("ActiveMatchQueueExistsError", (err) =>
        Effect.succeed(
          new Response(
            JSON.stringify({
              type: 4,
              data: {
                content: err.message,
                flags: 64
              }
            }),
            { headers: { "content-type": "application/json" } }
          )
        )
      )
    );

    const resOrQueue = yield* queueResult;
    if (resOrQueue instanceof Response) {
      return resOrQueue;
    }

    const serialized = serializer.serializeMatchQueue(resOrQueue);
    return new Response(JSON.stringify(serialized), {
      headers: { "content-type": "application/json" }
    });
  });


export const handleProfile = (
  interaction: ParsedInteraction & { readonly _tag: "Command" }
) =>
  Effect.gen(function* () {
    const playerRepo = yield* PlayerRepository;
    const matchRepo = yield* MatchRepository;
    const serializer = yield* DiscordResponseSerializer;

    const statsOption = yield* playerRepo.getPlayer(interaction.user.id, interaction.guildId);
    
    let content = "";
    if (Option.isSome(statsOption)) {
      const avgSoloScore = yield* matchRepo.getPlayerAverageScore(interaction.user.id, interaction.guildId, "single");
      const avgMultiScore = yield* matchRepo.getPlayerAverageScore(interaction.user.id, interaction.guildId, "multi");
      const recentMatches = yield* matchRepo.getRecentMatches(interaction.user.id, interaction.guildId, 10);
      
      let recentStr = "None";
      const multiMatches = recentMatches.filter(m => m.mode === "multi");
      if (multiMatches.length > 0) {
        const symbols = multiMatches.map((m) => {
          if (m.winnerId === interaction.user.id) return "🟩"; // Win
          if (m.winnerId === null) return "🟨"; // Draw
          return "🟥"; // Loss
        });
        recentStr = symbols.join(" ");
      }

      content = `👤 **Player Profile: ${interaction.user.globalName || interaction.user.username}**\n\n` +
        `🎮 **Solo Mode**\n` +
        `• Games Played: **${statsOption.value.soloPlayCount}**\n` +
        `• Avg Score: **${avgSoloScore}**점\n` +
        `• Highest Score: **${statsOption.value.soloHighestScore}**점\n\n` +
        `⚔️ **Matching Mode (VS)**\n` +
        `• Elo Rating: **${statsOption.value.elo}**\n` +
        `• Wins: **${statsOption.value.multiWins}** | Losses: **${statsOption.value.multiLosses}** | Draws: **${statsOption.value.multiDraws}**\n` +
        `• Avg Score: **${avgMultiScore}**점\n` +
        `• Highest Score: **${statsOption.value.multiHighestScore}**점\n` +
        `• Recent 10 Matches: ${recentStr}\n\n` +
        `🔗 **상세 전적 및 리플레이**: [웹 대시보드 바로가기](https://discord-yachoo.woowong.workers.dev/web?player=${interaction.user.id})`;
    } else {
      content = `👤 **Player Profile: ${interaction.user.globalName || interaction.user.username}**\n\n` +
        `No games played yet. Use \`/challenge\` to start your first game!`;
    }

    const responsePayload = serializer.serializeMessage(content);
    return new Response(JSON.stringify(responsePayload), {
      headers: { "content-type": "application/json" }
    });
  });

export const handleLeaderboard = (
  interaction: ParsedInteraction & { readonly _tag: "Command" }
) =>
  Effect.gen(function* () {
    const playerRepo = yield* PlayerRepository;
    const serializer = yield* DiscordResponseSerializer;

    const mode = (interaction.options.type === "solo" ? "single" : "multi") as "single" | "multi";
    const topPlayers = yield* playerRepo.getLeaderboard(mode, interaction.guildId, 10);
    const responsePayload = serializer.serializeLeaderboard(topPlayers, mode);
    return new Response(JSON.stringify(responsePayload), {
      headers: { "content-type": "application/json" }
    });
  });

export const handleHistory = (
  interaction: ParsedInteraction & { readonly _tag: "Command" }
) =>
  Effect.gen(function* () {
    const matchRepo = yield* MatchRepository;
    const serializer = yield* DiscordResponseSerializer;

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
  });
