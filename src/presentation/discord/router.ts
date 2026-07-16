import { Effect, Option } from "effect";
import { ParsedInteraction } from "./adapter/types";
import { GameRepository } from "../../persistence/repository";
import { DiscordResponseSerializer } from "./adapter/serializer";
import { 
  handleChallenge, 
  handleProfile, 
  handleLeaderboard, 
  handleHistory 
} from "./handlers/commands";
import { 
  handleBackToHistoryList, 
  handleViewHistory, 
  handlePageHistory, 
  handleSurrender, 
  handleConfirmSurrender, 
  handleHold, 
  handleRoll, 
  handleSelectCategory 
} from "./handlers/components";

export const routeInteraction = (
  rawJson: any,
  interaction: ParsedInteraction,
  safeCtx: any
) =>
  Effect.gen(function* () {
    const serializer = yield* DiscordResponseSerializer;

    if (interaction._tag === "Ping") {
      return new Response(JSON.stringify({ type: 1 }), {
        headers: { "content-type": "application/json" }
      });
    }

    if (interaction._tag === "Command") {
      switch (interaction.commandName) {
        case "challenge":
          return yield* handleChallenge(interaction, rawJson, safeCtx);
        case "profile":
          return yield* handleProfile(interaction);
        case "leaderboard":
          return yield* handleLeaderboard(interaction);
        case "history":
          return yield* handleHistory(interaction);
        default:
          return new Response(
            JSON.stringify(serializer.serializeError(`Unknown command: ${interaction.commandName}`)),
            { headers: { "content-type": "application/json" } }
          );
      }
    }

    if (interaction._tag === "Component") {
      const customId = interaction.customId;

      if (customId === "backtohistorylist") {
        return yield* handleBackToHistoryList(interaction);
      }
      if (customId.startsWith("viewhistory_")) {
        return yield* handleViewHistory(interaction);
      }
      if (customId.startsWith("pagehistory_")) {
        return yield* handlePageHistory(interaction);
      }

      // Load active game for gameplay components
      const footerText = rawJson.message?.embeds?.[0]?.footer?.text || "";
      const gameIdMatch = footerText.match(/Game ID:\s*([a-zA-Z0-9]+)/);
      if (!gameIdMatch) {
        return new Response(
          JSON.stringify(serializer.serializeError("Game ID not found in message")),
          { headers: { "content-type": "application/json" } }
        );
      }
      const gameId = gameIdMatch[1];
      const gameRepo = yield* GameRepository;
      const gameStateOption = yield* gameRepo.findById(gameId);
      if (Option.isNone(gameStateOption)) {
        return new Response(
          JSON.stringify(serializer.serializeError(`Game not found: ${gameId}`)),
          { headers: { "content-type": "application/json" } }
        );
      }
      const gameState = gameStateOption.value;

      if (customId === "surrender") {
        return yield* handleSurrender(interaction, gameState, rawJson);
      }
      if (customId.startsWith("confirm_surrender_")) {
        return yield* handleConfirmSurrender(interaction, gameState, safeCtx);
      }
      if (customId.startsWith("hold_")) {
        return yield* handleHold(interaction, gameState, safeCtx);
      }
      if (customId.startsWith("roll_")) {
        return yield* handleRoll(interaction, gameState, safeCtx);
      }
      if (customId === "select_category") {
        return yield* handleSelectCategory(interaction, gameState, rawJson, safeCtx);
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
