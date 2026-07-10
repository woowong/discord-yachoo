## Context

The Yacht Dice Discord bot needs to run on Cloudflare Workers and interact with the Discord API. Currently, the local workspace is configured for local simulation/development, and deploying to production requires specific binding configurations and security setups that were missing or incorrectly set (e.g. database binding name changed to `yacht_dice` instead of `DB`).

## Goals / Non-Goals

**Goals:**
- Correct the `wrangler.toml` configuration to declare `[[d1_databases]]` with `binding = "DB"` referencing the remote database UUID `d30f4a69-d298-4374-ab91-7fea361a693a`.
- Outline the process for applying migrations remotely using Wrangler.
- Outline the environment setup for the slash commands registration script.
- Establish how the Discord Interaction Webhook signature verification will function via `DISCORD_PUBLIC_KEY` secret.

**Non-Goals:**
- Writing new gameplay rules or game engine modifications.
- Implementing any automatic deployment pipeline (CI/CD).

## Decisions

### 1. D1 Database Binding Name
- **Decision**: Set the binding name to `DB` instead of `yacht_dice`.
- **Rationale**: The code in `src/index.ts` fetches the D1 instance from `env.DB`. Changing the binding name in `wrangler.toml` to anything else would cause `env.DB` to be undefined at runtime.
- **Alternatives Considered**: Modifying the code in `src/index.ts` to look for `env.yacht_dice`. This was rejected to keep the codebase clean and avoid unnecessary changes in the application source code.

### 2. D1 Schema Migrations
- **Decision**: Execute migrations via Wrangler CLI CLI directly to the remote instance (`wrangler d1 migrations apply yacht_dice --remote`).
- **Rationale**: Direct application via CLI is standard and reliable for Cloudflare D1 databases.

## Risks / Trade-offs

- **[Risk]** Discord signature verification fails due to trailing newline/spaces or incorrect secret key in `DISCORD_PUBLIC_KEY`.
  - *Mitigation*: Ensure the secret is added via `wrangler secret put DISCORD_PUBLIC_KEY` and the exact value from the developer portal is copied.
- **[Risk]** Slash command registration globally takes up to an hour to propagate.
  - *Mitigation*: For development/testing servers, include `DISCORD_GUILD_ID` to register instantly for immediate debugging.
