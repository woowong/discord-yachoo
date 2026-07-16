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

    const challengeResult = workflow.challenge(
      challengerId,
      challengerName,
      opponentId,
      opponentId ? opponentName : undefined,
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

export const handleProfile = (
  interaction: ParsedInteraction & { readonly _tag: "Command" }
) =>
  Effect.gen(function* () {
    const playerRepo = yield* PlayerRepository;
    const serializer = yield* DiscordResponseSerializer;

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
