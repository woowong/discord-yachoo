# Design

## Context

The `discord-yachoo` project currently configures Cloudflare Workers through `wrangler.toml`, including production and staging environments with separate D1 databases (`yacht_dice` and `yacht_dice_stage`) and `FLY_BRAIN_URL` environment variables. With the release of the new `cf` CLI, Cloudflare introduces a code-first TypeScript configuration (`cloudflare.config.ts`) and modular bundler delegation.

See `proposal.md` for motivation and background.

## Goals / Non-Goals

**Goals:**
- Migrate from `wrangler.toml` to `cloudflare.config.ts` with strict TypeScript types.
- Preserve existing environments (production and staging) using `ctx.mode` branching in `cloudflare.config.ts`.
- Map D1 database bindings (`DB`) for production (`yacht_dice`, id `d30f4a69-d298-4374-ab91-7fea361a693a`) and staging (`yacht_dice_stage`, id `f8368ba8-d490-418a-884d-cd27ab0cc3e7`).
- Map environment variables (`FLY_BRAIN_URL: "https://solving-delaware-confident-test.trycloudflare.com"`).
- Update npm scripts (`dev` -> `cf dev`, `deploy` -> `cf deploy`) and devDependencies (`cf`).
- Ensure all automated unit tests continue to pass without regressions.

**Non-Goals:**
- Switching bundlers to Vite (the project will continue using Wrangler bundler via `wrangler.config.ts` delegated by `cf`).
- Altering core game logic, presentation, or database schemas.

## Decisions

### 1. Automated Migration via `cf migrate` with Manual Review
- **Decision**: Use `cf migrate ./wrangler.toml` to automatically scaffold `cloudflare.config.ts` and `wrangler.config.ts`, then inspect and verify the configuration.
- **Rationale**: `cf migrate` accurately translates existing `wrangler.toml` syntax, handles bundler configuration, and updates package dependencies.
- **Alternatives Considered**: Writing `cloudflare.config.ts` from scratch manually, which has higher risk of schema or configuration property mismatches.

### 2. Environment Management via `ctx.mode`
- **Decision**: In `cloudflare.config.ts`, use `switch (ctx.mode)` or ternary conditions based on `ctx.mode === 'staging'` to dynamically select database name, database ID, and worker name (`discord-yachoo` vs `discord-yachoo-stage`).
- **Rationale**: The `cf` CLI uses the `--mode` flag (e.g. `cf deploy --mode staging`) to configure environments dynamically.
- **Alternatives Considered**: Creating multiple configuration files; rejected because single file with `ctx.mode` is standard for `cf`.

### 3. Bundler Choice: Wrangler Bundler
- **Decision**: Retain Wrangler bundler delegation as configured by default during migration.
- **Rationale**: The project does not currently use `@cloudflare/vite-plugin`, so using the default bundler ensures zero friction with current TypeScript and Effect.ts imports.
- **Alternatives Considered**: Migrating to Vite, which would require introducing `@cloudflare/vite-plugin` and potentially modifying build setup.

## Risks / Trade-offs

- **[Risk]** Flag syntax differences between `wrangler` and `cf` CLI commands.
  → **Mitigation**: Update all package scripts and verify with `--dry-run` and tests.
- **[Risk]** Missing or misnamed bindings in `cloudflare.config.ts`.
  → **Mitigation**: Thoroughly inspect the generated `cloudflare.config.ts` and verify D1 bindings match the IDs from `wrangler.toml`.

## Migration Plan

1. Run `cf migrate ./wrangler.toml --force` to generate `cloudflare.config.ts` and `wrangler.config.ts`.
2. Inspect and refine `cloudflare.config.ts` to ensure D1 database IDs, worker names, and variables match across modes.
3. Update `package.json` scripts:
   - `"dev": "cf dev"`
   - `"deploy": "cf deploy"`
4. Remove obsolete `wrangler.toml`.
5. Run unit tests (`npm test`) and typechecks.
6. Verify deployment configuration via `cf deploy --dry-run`.
