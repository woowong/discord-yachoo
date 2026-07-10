import { Effect, Context, Layer } from "effect";
import { ParsedInteraction, DiscordUser } from "./types";

export class ParseError {
  readonly _tag = "ParseError";
  constructor(readonly message: string, readonly cause?: unknown) {}
}

export interface DiscordInteractionParser {
  readonly parse: (body: string) => Effect.Effect<ParsedInteraction, ParseError>;
}

export const DiscordInteractionParser = Context.GenericTag<DiscordInteractionParser>("@services/DiscordInteractionParser");

export const DiscordInteractionParserLive = Layer.succeed(
  DiscordInteractionParser,
  {
    parse: (body) =>
      Effect.try({
        try: () => {
          const raw = JSON.parse(body);
          const interactionType = raw.type;

          if (interactionType === 1) {
            return { _tag: "Ping" } as const;
          }

          const rawUser = raw.user || raw.member?.user;
          if (!rawUser) {
            throw new Error("Missing user information in interaction payload");
          }

          const user: DiscordUser = {
            id: rawUser.id,
            username: rawUser.username,
            globalName: rawUser.global_name || null
          };

          const applicationId = raw.application_id || "";
          const token = raw.token || "";

          if (interactionType === 2) {
            const commandName = raw.data?.name;
            if (!commandName) {
              throw new Error("Missing command name in type 2 interaction");
            }

            const options: Record<string, any> = {};
            const rawOptions = raw.data?.options || [];
            for (const opt of rawOptions) {
              options[opt.name] = opt.value;
            }

            return {
              _tag: "Command",
              commandName,
              applicationId,
              token,
              user,
              options
            } as const;
          }

          if (interactionType === 3) {
            const customId = raw.data?.custom_id;
            if (!customId) {
              throw new Error("Missing custom_id in type 3 interaction");
            }

            return {
              _tag: "Component",
              customId,
              applicationId,
              token,
              user,
              values: raw.data?.values || undefined
            } as const;
          }

          throw new Error(`Unsupported interaction type: ${interactionType}`);
        },
        catch: (error) => new ParseError(`Failed to parse interaction payload: ${error}`, error)
      })
  }
);
