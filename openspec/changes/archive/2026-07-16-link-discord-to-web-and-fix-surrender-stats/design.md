## Context
To make the Discord bot and the Web Dashboard work as a unified ecosystem, we need to add dynamic web redirection links. Additionally, we need to distinguish match surrenders from standard finishes, and exclude incomplete surrendered matches from average score calculations to keep the metric representative.

## Goals / Non-Goals

**Goals:**
- Add a new SQLite migration to introduce `surrendered_id` in the `matches` table.
- Populate `surrenderedId` in MatchRepository when saving a surrendered game.
- Filter out surrendered matches (`surrendered_id IS NULL OR surrendered_id = ''`) in `getPlayerAverageScore`.
- Render `KO` (기권패) indicator in Discord `/history` and Web dashboard recent matches table.
- Append organic web links to `/profile`, `/leaderboard`, `/history` commands and game-over/surrender notifications in Discord.

**Non-Goals:**
- Allowing players to choose whether to exclude surrenders in the profile command (it is automatically excluded by default).

## Decisions

### 1. Database Schema Migration
- **Choice**: Create `migrations/0008_add_surrendered_id.sql`:
  ```sql
  ALTER TABLE matches ADD COLUMN surrendered_id TEXT;
  ```
- **Rationale**: Clean, direct, and compatible. Historical matches will naturally have `NULL`, which translates to non-surrendered state, guaranteeing backward compatibility.

### 2. Excluding Surrenders from Average Calculations
- **Choice**: Update `getPlayerAverageScore` queries to filter matches:
  `AND (surrendered_id IS NULL OR surrendered_id = '')`
- **Rationale**: By filtering out games that were forfeited early, the average score accurately represents the player's performance in completed matches.

### 3. Displaying KO / Surrender in History
- **Choice**: Modify `outcome` checks:
  - If a player won and `match.surrenderedId !== null`: Display `Won (KO) 🏆`
  - If a player lost and `match.surrenderedId === userId`: Display `Lost (KO) 🏳️` (or `기권패 (KO) 🏳️`)
- **Rationale**: Clearly highlights to users that a match ended via forfeit instead of normal category completion.

### 4. Direct Links to Web Dashboard
- **Choice**: Append markdown links using the base domain `https://discord-yachoo.woowong.workers.dev/web`:
  - `/profile` & `/history`: `[웹 대시보드 바로가기](https://discord-yachoo.woowong.workers.dev/web?player={userId})`
  - `/leaderboard`: `[웹 대시보드 바로가기](https://discord-yachoo.woowong.workers.dev/web)`
  - Game over message: `[웹 대시보드에서 경기 복기하기](https://discord-yachoo.woowong.workers.dev/web?player={winnerId})`
- **Rationale**: The browser app automatically parses `?player` and displays their statistics card, creating a seamless click-through experience.

## Risks / Trade-offs

- **[Risk] Migration Application**: Running ALTER TABLE on active databases must not block existing read/writes.
  - *Mitigation*: SQLite D1 ALTER TABLE is fast and non-blocking for adding a nullable column.
