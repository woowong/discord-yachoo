# Proposal

## Why

Cloudflare has released the new unified Cloudflare CLI (`cf`), replacing Wrangler with a modern developer experience featuring typesafe configuration (`cloudflare.config.ts`), explicit mode switching, and bundler delegation (e.g. Vite or Wrangler bundler). Migrating `discord-yachoo` to the `cf` CLI simplifies configuration maintenance, improves build reliability, and aligns the project with Cloudflare's next-generation tooling.

## What Changes

- Run `cf migrate` on `wrangler.toml` to generate `cloudflare.config.ts` (and `wrangler.config.ts` for Wrangler bundler delegation).
- Migrate D1 database bindings (`yacht_dice` production and `yacht_dice_stage` staging) to typesafe configuration using `ctx.mode`.
- Migrate environment variable `FLY_BRAIN_URL` into `cloudflare.config.ts`.
- Update `package.json` scripts to replace `wrangler dev` with `cf dev` and `wrangler deploy` with `cf deploy`.
- Update `package.json` devDependencies from `wrangler` to `cf` (`^1.0.0-beta.10`).
- Remove obsolete `wrangler.toml`.

## Capabilities

### Modified Capabilities
- `project-infra-setup`: Update infrastructure requirements from `wrangler.toml` and Wrangler CLI to `cloudflare.config.ts` and `cf` CLI.

## Impact

- **Configuration**: `wrangler.toml` is replaced by TypeScript-based `cloudflare.config.ts`.
- **Scripts**: `npm run dev` executes `cf dev` and `npm run deploy` executes `cf deploy`.
- **Dependencies**: devDependency `wrangler` is replaced with `cf`.
- **CI/CD & Local Development**: Developers and automated workflows will use `cf` commands instead of `wrangler`.
