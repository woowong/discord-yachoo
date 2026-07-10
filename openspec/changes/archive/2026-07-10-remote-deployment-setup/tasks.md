## 1. Wrangler Configuration

- [x] 1.1 Correct `wrangler.toml` to declare `[[d1_databases]]` with `binding = "DB"`, `database_name = "yacht_dice"`, and `database_id = "d30f4a69-d298-4374-ab91-7fea361a693a"`.

## 2. Remote Database Setup

- [x] 2.1 Apply local D1 database schema migrations to the remote D1 instance using Wrangler (`npx wrangler d1 migrations apply yacht_dice --remote`).

## 3. Worker Secrets & Deployment

- [x] 3.1 Upload `DISCORD_PUBLIC_KEY` secret to Cloudflare Worker using Wrangler (`npx wrangler secret put DISCORD_PUBLIC_KEY`).
- [x] 3.2 Deploy the Worker to Cloudflare (`npm run deploy`).

## 4. Verification & E2E Testing

- [x] 4.1 Set the Interactions Endpoint URL in the Discord Developer Portal to the deployed Worker's HTTPS address.
- [x] 4.2 Start tailing Worker logs using `npx wrangler tail`.
- [x] 4.3 Test the `/challenge` slash command in a Discord channel and play a game to verify E2E interactions work successfully.
