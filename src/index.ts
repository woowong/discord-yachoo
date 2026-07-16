import { Effect, Layer } from "effect";
import { D1Database } from "./persistence/d1/database";
import { D1PlayerRepositoryLive, D1MatchRepositoryLive, D1GameRepositoryLive } from "./persistence/d1/repository";
import { DiscordSignatureVerifier, DiscordSignatureVerifierLive } from "./presentation/discord/adapter/signature";
import { DiscordInteractionParser, DiscordInteractionParserLive } from "./presentation/discord/adapter/parser";
import { DiscordResponseSerializerLive } from "./presentation/discord/adapter/serializer";
import { DiscordApiServiceLive, DiscordBotToken } from "./presentation/discord/adapter/api";
import { GameWorkflowServiceLive } from "./application/GameWorkflowService";
import { routeInteraction } from "./presentation/discord/router";

export default {
  async fetch(request: Request, env: { DB: D1Database; DISCORD_PUBLIC_KEY: string; DISCORD_BOT_TOKEN?: string }, ctx: any): Promise<Response> {
    const signature = request.headers.get("x-signature-ed25519") || "";
    const timestamp = request.headers.get("x-signature-timestamp") || "";

    const safeCtx = {
      ...ctx,
      waitUntil: (ctx && typeof ctx.waitUntil === "function")
        ? (p: any) => ctx.waitUntil(p)
        : (p: any) => { p.catch(() => {}); }
    };

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

      let annotated = routeInteraction(rawJson, interaction, safeCtx);

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
      apiServiceLayer,
      GameWorkflowServiceLive
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
