## Context

Currently, multiplayer games start immediately upon executing `/challenge @opponent`. There is no mechanism to verify the opponent's willingness to play or to queue up for open matchmaking in a channel.

This design introduces a two-tier matchmaking system:
1. **Direct Challenge Invitation System**: Creates a 5-minute timed invitation card with `[Accept]` and `[Decline]` buttons.
2. **Open Matchmaking Queue System**: Allows a user to create an open game lobby (`/match`), allowing any channel member to join via a `[Join Match]` button.

## Goals / Non-Goals

**Goals:**
- Provide a non-intrusive 5-minute invitation mechanism for direct 1v1 challenges.
- Provide a simple open lobby/queue system (`/match`) for spontaneous channel matchmaking.
- Enforce strict player permission checks (e.g. only the challenged player can accept a direct invitation; only the host can cancel a lobby).
- Maintain stateless serverless execution using Cloudflare Workers & D1 without requiring background interval loops (using lazy expiration checks).

**Non-Goals:**
- Global multi-guild matchmaking across different Discord servers (matchmaking is scoped per guild/channel).
- Automated Elo-based matchmaking queues (queues are first-come, first-served).

## Decisions

### 1. Lazy Expiration Evaluation (300 seconds TTL)
- **Decision**: Store `createdAt` timestamp in D1 for invitations and match queues. Check expiration lazily when an interaction button is clicked. If `currentTime - createdAt > 300,000ms`, mark as `EXPIRED` and reply with an error message ("This invitation/queue has expired.").
- **Rationale**: Serverless Cloudflare Workers are event-driven. Lazy evaluation avoids needing background cron tickers or polling loops, keeping infrastructure cost and complexity at zero.

### 2. D1 Persistence Schemas
- **Decision**: Introduce `invitations` and `match_queues` tables in Cloudflare D1 (and corresponding migrations):
  ```sql
  CREATE TABLE IF NOT EXISTS invitations (
    id TEXT PRIMARY KEY,
    challenger_id TEXT NOT NULL,
    challenger_name TEXT NOT NULL,
    opponent_id TEXT NOT NULL,
    opponent_name TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, ACCEPTED, DECLINED, EXPIRED
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS match_queues (
    id TEXT PRIMARY KEY,
    host_id TEXT NOT NULL,
    host_name TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'WAITING', -- WAITING, MATCHED, CANCELLED, EXPIRED
    created_at INTEGER NOT NULL
  );
  ```
- **Rationale**: Decouples game session storage (`games` table) from pending pre-game states.

### 3. Discord Custom ID Conventions
- **Decision**: Use structured custom IDs for Discord Component Button interactions:
  - `invitation:accept:<invitationId>`
  - `invitation:decline:<invitationId>`
  - `queue:join:<queueId>`
  - `queue:cancel:<queueId>`
- **Rationale**: Allows the presentation layer router (`router.ts` & `buttons.ts`) to parse interaction actions and parameters deterministically.

## Risks / Trade-offs

- **[Risk] Ghost pending states in DB**: Unanswered invitations will remain in DB as `PENDING` until user clicks them post-expiry or a manual cleanup is run.
  - **Mitigation**: Add a fallback helper `isExpired(item)` during queries, and include an optional cleanup sweep in background migration or workflow logic if needed.
- **[Risk] Multiple active invitations per user**: A user might spam invitations.
  - **Mitigation**: Enforce an active pending check in `GameWorkflowService` so a player can only have 1 active pending invitation or queue at a time per guild/channel.
