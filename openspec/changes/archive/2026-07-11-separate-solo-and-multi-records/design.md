## Context

Currently, solo and multiplayer game statistics are mixed in the `players` database table. The `/profile` command lists a single unified set of wins, losses, draws, and highest score, while `/leaderboard` ranks everyone by this unified highest score. To improve the user experience, we will separate these statistics into two distinct categories:
- **Solo Mode**: Focuses on games played and personal highest score.
- **Matching Mode (Multiplayer)**: Focuses on competitive stats (wins, losses, draws) and highest score in matches.

## Goals / Non-Goals

**Goals:**
- Separate solo and multiplayer records in the database.
- Update `/profile` response to present solo stats and matching stats separately.
- Update `/leaderboard` command to accept a `type` parameter (`solo` or `multi`), defaulting to `multi`, and order them by `solo_highest_score` and `multi_wins` respectively.
- Maintain backward compatibility by keeping legacy columns (`wins`, `losses`, `draws`, `highest_score`) updated.

**Non-Goals:**
- Removing legacy columns from the database (for safety and backward compatibility).
- Changing match history storage or format.

## Decisions

### 1. Database Schema Additions
We will add 6 new columns to the `players` table:
- `solo_play_count` (INTEGER, DEFAULT 0)
- `solo_highest_score` (INTEGER, DEFAULT 0)
- `multi_wins` (INTEGER, DEFAULT 0)
- `multi_losses` (INTEGER, DEFAULT 0)
- `multi_draws` (INTEGER, DEFAULT 0)
- `multi_highest_score` (INTEGER, DEFAULT 0)

*Alternative Considered*: Re-creating the table or dropping old columns. This was rejected to avoid breaking existing queries or failing during serverless runtime execution.

### 2. Migration and Initialization
We will run a D1 SQL migration that adds the columns and populates them using a safe baseline update:
```sql
UPDATE players SET
  multi_wins = wins,
  multi_losses = losses,
  multi_draws = draws,
  multi_highest_score = highest_score,
  solo_highest_score = highest_score;
```

### 3. Repository and API Updates
- **`PlayerStats` Interface**: Add the 6 new fields.
- **`updateStats` Method**:
  ```typescript
  updateStats(id: string, mode: "single" | "multi", outcome: "win" | "loss" | "draw", score: number)
  ```
  - For `single` mode: increment `solo_play_count`, update `solo_highest_score = MAX(solo_highest_score, score)`.
  - For `multi` mode: update `multi_wins`/`multi_losses`/`multi_draws` according to `outcome`, update `multi_highest_score = MAX(multi_highest_score, score)`.
  - Both modes will continue updating the legacy columns (`wins`, `losses`, `draws`, `highest_score`) for backward compatibility.
- **`getLeaderboard` Method**:
  ```typescript
  getLeaderboard(mode: "single" | "multi", limit: number)
  ```
  - Mode `single`: `ORDER BY solo_highest_score DESC`
  - Mode `multi`: `ORDER BY multi_wins DESC, multi_highest_score DESC`

### 4. Discord UI Formatting
- `/profile`: Render two sections under the player's name: 🎮 **Solo Mode** and ⚔️ **Matching Mode**.
- `/leaderboard`: Add an optional command choice option: `type` (`solo` / `multi`). The serializer will format the list differently based on the selected mode:
  - Solo leaderboard shows `Best Score: **${player.soloHighestScore}** | Played: **${player.soloPlayCount}**`
  - Matching leaderboard shows `Wins: **${player.multiWins}** | Losses: **${player.multiLosses}** | Best Score: **${player.multiHighestScore}**`

## Risks / Trade-offs

- **[Risk] Schema Migration Failure** → Mitigation: Use standard `ALTER TABLE ... ADD COLUMN ...` statements which are safe and non-blocking in SQLite / Cloudflare D1.
- **[Risk] Command caching in Discord** → Mitigation: Re-register Discord application commands using the registration script (`scripts/register-commands.ts`) after deployment.
