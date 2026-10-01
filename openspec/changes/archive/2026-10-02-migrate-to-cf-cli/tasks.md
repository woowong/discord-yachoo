# Tasks

## 1. Migration Execution

- [x] 1.1 Run `cf migrate ./wrangler.toml --force` and verify `cloudflare.config.ts` and `wrangler.config.ts` are generated
- [x] 1.2 Review and verify `cloudflare.config.ts` to ensure D1 database bindings, staging mode branching, compatibility date, and environment variables are properly configured
- [x] 1.3 Update `package.json` scripts (`dev` -> `cf dev`, `deploy` -> `cf deploy`) and verify dependencies include `cf`
- [x] 1.4 Remove obsolete `wrangler.toml` and verify file deletion in git status

## 2. Validation & Verification

- [x] 2.1 Run `npm test` and verify all Vitest tests pass
- [x] 2.2 Run `cf deploy --dry-run` and verify build and packaging succeed
