## Context
The recently launched Web Dashboard provides high-level player stats and historical game replays. However, to enhance usability and readability, we need to add a Player Directory for easy profile lookup, link player names inside matches to their stats cards, allow tag-based filtering of Legend Matches, and compact the overall styling for improved visual density.

## Goals / Non-Goals

**Goals:**
- Implement `getAllPlayers` query in `PlayerRepository` to fetch registered users.
- Add `GET /web/api/players` API endpoint.
- Update Web Dashboard UI to display player chips that search profiles on click.
- Add interactive profile links to player names in history tables and replay modals.
- Implement tag filtering for Legend Matches (`All`, `Yacht`, `Comeback`, `Streak`, `Fail`).
- Compact HTML table padding, row heights, and card margins via Vanilla CSS.

**Non-Goals:**
- Adding a search autocomplete bar (simple grid directory of registered players is sufficient).
- Modifying the D1 database schema (the existing `players` and `matches` tables are sufficient).

## Decisions

### 1. D1 Query for Player Directory
- **Choice**: Implement `getAllPlayers(guildId, limit)` inside `PlayerRepository`.
  - If `guildId` is present:
    ```sql
    SELECT p.id, p.name, g.elo, g.multi_wins, g.multi_losses
    FROM guild_player_stats g
    JOIN players p ON g.player_id = p.id
    WHERE g.guild_id = ?
    ORDER BY g.elo DESC, p.name ASC LIMIT ?
    ```
  - If `guildId` is null:
    ```sql
    SELECT id, name, elo, multi_wins, multi_losses
    FROM players
    ORDER BY elo DESC, name ASC LIMIT ?
    ```
- **Rationale**: Reuses the ELO ranking system to order players. Combining with `players` name ensures accurate nicknames are resolved.

### 2. Client-Side Player Nickname Cross-Linking
- **Choice**: Resolve player IDs in browser templates by mapping `turn.playerIndex` to `match.player1Id` (if 0) or `match.player2Id` (if 1).
- **Rationale**: Since `TurnRecord` inside `history_json` only stores `playerIndex` and `playerName` for space optimization, mapping the index to the outer `MatchRecord` IDs is the most efficient way to generate profile links without modifying the DB schema.

### 3. Client-Side Legend Match Filtering
- **Choice**: Render tag filters as clickable badges and toggle card visibility via `card.style.display` in client-side JS based on `data-tags` values.
- **Rationale**: Instant response time (no API call latency) and zero network overhead. Since the worker returns a pre-filtered list of the last 50 matches, client-side filtering is extremely fast.

### 4. Compact Design System Tokens
- **Choice**: Reduce padding and font sizes across components:
  - Table cell padding: `0.5rem 0.8rem` (from `1rem 1.2rem`).
  - Search bar input & button: `0.6rem 1rem` (from `0.8rem 1.2rem`).
  - Glass card margins: `1.2rem` (from `2rem`).
- **Rationale**: Increases data density and minimizes scroll fatigue.

## Risks / Trade-offs

- **[Risk] High player count rendering**: Rendering 100+ player directory chips could bloat the DOM.
  - *Mitigation*: Limit the `getAllPlayers` API result to top 50 players sorted by ELO. This provides a neat directory of active players.
