## 1. Webhook Signature Verification Setup

- [x] 1.1 Create the signature verification function using Web Crypto API in `src/presentation/discord/adapter/signature.ts`.
- [x] 1.2 Define the `DiscordSignatureVerifier` tag and `DiscordSignatureVerifierLive` layer in the same module.

## 2. Interaction Parsing & Mapping

- [x] 2.1 Define TypeScript models for Discord Interaction payloads (PING, ApplicationCommand, MessageComponent) in `src/presentation/discord/adapter/types.ts`.
- [x] 2.2 Implement the `DiscordInteractionParser` interface and `DiscordInteractionParserLive` layer in `src/presentation/discord/adapter/parser.ts` to map payloads to domain actions.

## 3. Response Serialization

- [x] 3.1 Implement the `DiscordResponseSerializer` interface and its live layer in `src/presentation/discord/adapter/serializer.ts` to format game states/leaderboards as rich embeds and button component grids.

## 4. Tests & Verification

- [x] 4.1 Write unit tests in `src/presentation/discord/adapter/adapter.test.ts` covering signature verification, payload parsing, and serialization.
