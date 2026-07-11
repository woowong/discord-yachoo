import { Effect, Context, Layer } from "effect";

export interface DiscordApiService {
  readonly sendMention: (channelId: string, userId: string) => Effect.Effect<string, Error>;
  readonly deleteMessage: (channelId: string, messageId: string) => Effect.Effect<void, Error>;
}

export const DiscordApiService = Context.GenericTag<DiscordApiService>("@services/DiscordApiService");

export const DiscordBotToken = Context.GenericTag<string>("@services/DiscordBotToken");

export const DiscordApiServiceLive = Layer.effect(
  DiscordApiService,
  Effect.gen(function* () {
    const token = yield* DiscordBotToken;

    return {
      sendMention: (channelId, userId) =>
        Effect.tryPromise({
          try: async () => {
            if (!token) {
              console.warn("DISCORD_BOT_TOKEN is not configured. Skipping sendMention.");
              return "";
            }
            const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
              method: "POST",
              headers: {
                Authorization: `Bot ${token}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                content: `<@${userId}>님, 당신의 턴입니다! 주사위를 굴려주세요. 🎲`
              })
            });
            if (!res.ok) {
              throw new Error(`Discord API error (sendMention): ${res.status} ${await res.text()}`);
            }
            const data = (await res.json()) as any;
            return data.id as string;
          },
          catch: (error) => error as Error
        }),

      deleteMessage: (channelId, messageId) =>
        Effect.tryPromise({
          try: async () => {
            if (!token) {
              console.warn("DISCORD_BOT_TOKEN is not configured. Skipping deleteMessage.");
              return;
            }
            const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
              method: "DELETE",
              headers: {
                Authorization: `Bot ${token}`
              }
            });
            if (!res.ok && res.status !== 404) {
              throw new Error(`Discord API error (deleteMessage): ${res.status} ${await res.text()}`);
            }
          },
          catch: (error) => error as Error
        }).pipe(
          Effect.catchAll(() => Effect.void)
        )
    };
  })
);

export const DiscordApiServiceMockLive = Layer.succeed(
  DiscordApiService,
  {
    sendMention: (channelId, userId) =>
      Effect.sync(() => {
        console.log(`[Mock Discord API] Send mention to User <@${userId}> in Channel ${channelId}`);
        return `mock-msg-${Date.now()}`;
      }),
    deleteMessage: (channelId, messageId) =>
      Effect.sync(() => {
        console.log(`[Mock Discord API] Delete message ${messageId} in Channel ${channelId}`);
        return;
      })
  }
);
