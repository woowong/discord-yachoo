import { Effect, Option } from "effect";
import { ParsedInteraction } from "../../discord/adapter/types";
import { GameState, DiceHold, ScoreCategory } from "../../../domain/types";
import { MatchRepository, GameRepository } from "../../../persistence/repository";
import { DiscordResponseSerializer } from "../../discord/adapter/serializer";
import { DiscordApiService } from "../../discord/adapter/api";
import { GameWorkflowService } from "../../../application/GameWorkflowService";
import { KoreanMessages } from "../../messages/ko";

export const handleBackToHistoryList = (
  interaction: ParsedInteraction & { readonly _tag: "Component" }
) =>
  Effect.gen(function* () {
    const matchRepo = yield* MatchRepository;
    const serializer = yield* DiscordResponseSerializer;

    const recentMatches = yield* matchRepo.getRecentMatches(interaction.user.id, interaction.guildId, 5);
    const responsePayload = serializer.serializeHistoryList(recentMatches, interaction.user.id);
    const updatePayload = {
      ...responsePayload,
      type: 7 // UpdateMessage
    };
    return new Response(JSON.stringify(updatePayload), {
      headers: { "content-type": "application/json" }
    });
  });

export const handleViewHistory = (
  interaction: ParsedInteraction & { readonly _tag: "Component" }
) =>
  Effect.gen(function* () {
    const matchRepo = yield* MatchRepository;
    const serializer = yield* DiscordResponseSerializer;

    const matchId = interaction.customId.split("_")[1];
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
  });

export const handlePageHistory = (
  interaction: ParsedInteraction & { readonly _tag: "Component" }
) =>
  Effect.gen(function* () {
    const matchRepo = yield* MatchRepository;
    const serializer = yield* DiscordResponseSerializer;

    const parts = interaction.customId.split("_");
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
  });

export const handleSurrender = (
  interaction: ParsedInteraction & { readonly _tag: "Component" },
  gameState: GameState,
  rawJson: any
) =>
  Effect.gen(function* () {
    const serializer = yield* DiscordResponseSerializer;

    const isPlayerInGame = gameState.players.some((p) => p.playerId === interaction.user.id);
    if (!isPlayerInGame) {
      return new Response(
        JSON.stringify({
          type: 4,
          data: {
            content: KoreanMessages.errors.notPlayerInGame,
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

    const targetMessageId = rawJson.message?.id || "";

    return new Response(
      JSON.stringify({
        type: 4,
        data: {
          content: KoreanMessages.surrender.confirmText,
          flags: 64, // Ephemeral
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 4, // Danger (Red)
                  label: KoreanMessages.surrender.confirmButtonLabel,
                  custom_id: `confirm_surrender_${gameState.gameId}_${targetMessageId}`,
                  emoji: { name: "🏳️" }
                }
              ]
            }
          ]
        }
      }),
      { headers: { "content-type": "application/json" } }
    );
  });

export const handleConfirmSurrender = (
  interaction: ParsedInteraction & { readonly _tag: "Component" },
  gameState: GameState,
  safeCtx: any
) =>
  Effect.gen(function* () {
    const workflow = yield* GameWorkflowService;

    const parts = interaction.customId.split("_");
    const targetMessageId = parts[3] || "";
    const guildId = interaction.guildId || "@me";
    const channelId = interaction.channelId || "";

    const surrenderResult = workflow.surrender(
      gameState.gameId,
      interaction.user.id,
      guildId,
      channelId,
      targetMessageId,
      safeCtx
    );

    yield* surrenderResult;

    return new Response(
      JSON.stringify({
        type: 7, // UpdateMessage
        data: {
          content: KoreanMessages.surrender.completed,
          components: []
        }
      }),
      { headers: { "content-type": "application/json" } }
    );
  });

export const handleHold = (
  interaction: ParsedInteraction & { readonly _tag: "Component" },
  gameState: GameState,
  safeCtx: any
) =>
  Effect.gen(function* () {
    const gameRepo = yield* GameRepository;
    const serializer = yield* DiscordResponseSerializer;
    const apiService = yield* DiscordApiService;

    // Validate turn
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.playerId !== interaction.user.id) {
      return new Response(
        JSON.stringify({
          type: 4,
          data: {
            content: KoreanMessages.errors.notYourTurn(currentPlayer.playerId),
            flags: 64
          }
        }),
        { headers: { "content-type": "application/json" } }
      );
    }

    const parts = interaction.customId.split("_");
    const newHolds = parts[2];
    const responsePayload = serializer.serializeGame(gameState, newHolds);

    yield* Effect.logInfo(`Dice hold state updated: ${newHolds}`);

    // Delete mention on action
    if (gameState.lastMentionMessageId && gameState.lastMentionChannelId) {
      const deleteMentionTask = apiService.deleteMessage(gameState.lastMentionChannelId, gameState.lastMentionMessageId).pipe(
        Effect.catchAll(() => Effect.void),
        Effect.annotateLogs("userId", interaction.user.id),
        Effect.annotateLogs("guildId", interaction.guildId || "DM"),
        Effect.annotateLogs("actionType", interaction._tag),
        Effect.annotateLogs("actionName", interaction.customId),
        Effect.annotateLogs("gameId", gameState.gameId)
      );
      safeCtx.waitUntil(Effect.runPromise(deleteMentionTask));

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
  });

export const handleRoll = (
  interaction: ParsedInteraction & { readonly _tag: "Component" },
  gameState: GameState,
  safeCtx: any
) =>
  Effect.gen(function* () {
    const workflow = yield* GameWorkflowService;
    const serializer = yield* DiscordResponseSerializer;

    // Validate turn
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.playerId !== interaction.user.id) {
      return new Response(
        JSON.stringify({
          type: 4,
          data: {
            content: KoreanMessages.errors.notYourTurn(currentPlayer.playerId),
            flags: 64
          }
        }),
        { headers: { "content-type": "application/json" } }
      );
    }

    const parts = interaction.customId.split("_");
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

    const rollResult = workflow.roll(
      gameState.gameId,
      interaction.user.id,
      holdsTuple,
      interaction.applicationId,
      interaction.token,
      safeCtx
    );

    yield* rollResult;

    const rollingPayload = serializer.serializeRolling(gameState, holds);
    return new Response(JSON.stringify(rollingPayload), {
      headers: { "content-type": "application/json" }
    });
  });

export const handleSelectCategory = (
  interaction: ParsedInteraction & { readonly _tag: "Component" },
  gameState: GameState,
  rawJson: any,
  safeCtx: any
) =>
  Effect.gen(function* () {
    const workflow = yield* GameWorkflowService;
    const serializer = yield* DiscordResponseSerializer;

    // Validate turn
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.playerId !== interaction.user.id) {
      return new Response(
        JSON.stringify({
          type: 4,
          data: {
            content: KoreanMessages.errors.notYourTurn(currentPlayer.playerId),
            flags: 64
          }
        }),
        { headers: { "content-type": "application/json" } }
      );
    }

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

    const guildId = interaction.guildId || "@me";
    const channelId = interaction.channelId || "";
    const messageId = rawJson.message?.id;

    const selectResult = workflow.selectCategory(
      gameState.gameId,
      interaction.user.id,
      category,
      guildId,
      channelId,
      messageId,
      safeCtx
    );

    const nextState = yield* selectResult;
    const responsePayload = serializer.serializeGame(nextState);
    return new Response(JSON.stringify(responsePayload), {
      headers: { "content-type": "application/json" }
    });
  });
