## Why

The Yacht Dice game is fully functional locally but needs to be deployed to the production Cloudflare Workers environment and connected to the Discord Developer Portal for live E2E gameplay in Discord servers. The current wrangler configuration uses a local D1 database database_id placeholder and needs to be updated with the remote D1 instance credentials and proper binding names.

## What Changes

- Update `wrangler.toml` to declare the correct remote D1 database binding (`[[d1_databases]]` with `binding = "DB"` and `database_id = "d30f4a69-d298-4374-ab91-7fea361a693a"`).
- Run and apply the database migrations to the remote D1 instance on Cloudflare.
- Register the slash commands (`/challenge`, `/profile`, `/leaderboard`) using `scripts/register-commands.ts` on the target Discord server (Guild) or globally.
- Configure `DISCORD_PUBLIC_KEY` secret on Cloudflare Workers for signature verification.
- Deploy the Worker to Cloudflare and register its interactions endpoint in the Discord Developer Portal.

## Capabilities

### New Capabilities
None

### Modified Capabilities
- `project-infra-setup`: Update the Cloudflare Workers wrangler configuration and infrastructure setup to support remote D1 database binding and signature verification secrets.

## Impact

- Cloudflare Workers runtime environment (`wrangler.toml` and environment bindings).
- Discord integration webhook endpoint and slash commands.
