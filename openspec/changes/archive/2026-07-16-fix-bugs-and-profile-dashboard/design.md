## Context
The application is a Discord Yacht Dice bot running on a Cloudflare Worker using D1 database. While primary actions occur on Discord, complex analysis like player profiles (average score tracking, win/loss history) and viewing detailed logs of interesting games ("Legend Matches") are better served through an interactive Web interface. Additionally, we need to fix two critical gameplay bugs: incorrect Discord mentions in teasing messages and surrender action failures in ephemeral message contexts.

## Goals / Non-Goals

**Goals:**
- Correct Discord mentions in teasing notifications by utilizing numerical User IDs.
- Ensure the surrender flow is operational by embedding `gameId` within confirmation buttons.
- Build a responsive Web Dashboard with glassmorphism dark aesthetics served directly from the same Cloudflare Worker.
- Add JSON endpoints `/web/api/profile/:playerId` and `/web/api/legend` to fetch statistics and legend match datasets.
- Implement `/profile` upgrades showing overall average scores and recent 10-match outcome streaks.

**Non-Goals:**
- Implementing user login/session auth on the Web Dashboard (public profiles resolved by player ID/guild ID are sufficient).
- Storing full game replay videos (only turn-by-turn category choices and dice scores are recorded).

## Decisions

### 1. Web Routing Bypass in Worker Entry Point
- **Choice**: Route GET requests under `/` and `/web/*` early in `src/index.ts` before verifying signature headers.
- **Rationale**: Discord webhook requests are POST requests carrying signatures. Web requests are browser GET requests that cannot produce these signature headers.
- **Alternative**: Running a separate worker for the web dashboard. Rejected because keeping it in a single worker allows sharing the D1 database binding, codebase dependencies, and repositories with zero additional cost or configuration.

### 2. Custom ID Encoding for Surrender Confirmation
- **Choice**: Format confirmation button custom ID as `confirm_surrender_${gameId}_${targetMessageId}`.
- **Rationale**: Since ephemeral messages have no embeds, the router cannot read the Game ID from footers. Passing it in the button's payload allows stateless recovery of the Game ID.
- **Alternative**: Storing a mapping of Message ID -> Game ID in KV or D1. Rejected because it introduces state lookup overhead and cleanup requirements, whereas custom ID payload is free and self-contained.

### 3. Extend `MatchRepository` for Average Score Calculations
- **Choice**: Add `getPlayerAverageScore(playerId, guildId, mode)` to `MatchRepository` to run aggregate queries in SQLite.
- **Rationale**: Computing averages in SQL (`AVG(CASE ...)`) is fast, database-native, and uses minimal memory compared to fetching all records to calculate averages in JavaScript.

### 4. Single-Page HTML App (SPA) served from Worker
- **Choice**: Embed HTML, CSS, and vanilla JS in a single string/file served by the Worker.
- **Rationale**: Extremely low overhead. No build pipelines, bundlers, or CDNs required. Using modern CSS (variables, grids) and ES6 vanilla JS allows creating a premium glassmorphic UI easily.

```
┌───────────────────────────────────────────────┐
│              WEB ROUTE EXECUTION              │
└───────────────────────────────────────────────┘
                        │
                        ▼
            GET /web/profile/:id?guildId=...
                        │
                        ▼
           Effect.runPromise(program)
            [Injected D1 Repo Layers]
                        │
       ┌────────────────┴────────────────┐
       ▼                                 ▼
Query PlayerStats                  Query Recent Matches
& Average Score                    & Turn Histories
       └────────────────┬────────────────┘
                        ▼
          JSON API / HTML Response
```

## Risks / Trade-offs

- **[Risk] Web API Exposure**: Public endpoints exposing player stats/gameplay could leak nicknames or user IDs.
  - *Mitigation*: The data is already public within the Discord guild. No sensitive token or authorization information is transmitted.
- **[Risk] SQLite JSON Parsing overhead**: Parsing `history_json` in Javascript to scan for "Legend Matches" could be slow if there are thousands of matches.
  - *Mitigation*: We will scan matches with simple SQL filters first (e.g. limit to last 100 matches) or index/cache legend matches if database size scales up.
