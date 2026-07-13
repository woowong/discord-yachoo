# OpenSpec Specs-based FAQ

This document is a Frequently Asked Questions (FAQ) list compiled based on the project's OpenSpec specification files ([openspec/specs/](./openspec/specs)).

---

## 📂 Categories
1. [Yacht Score Rules & State Machine](#1-yacht-score-rules--state-machine)
2. [Discord Integration & Commands](#2-discord-integration--commands)
3. [Persistence & D1 DB Schema](#3-persistence--d1-db-schema)
4. [Architecture & Dev Simulator](#4-architecture--dev-simulator)

---

## 1. Yacht Score Rules & State Machine

### Q. How do I get the Upper Section Bonus in a Yacht game?
**A.** An additional bonus score of **35 points** is awarded if the sum of all Upper Section categories (Aces, Deuces, Treys, Fours, Fives, Sixes) is **63 or higher**. (If 62 or lower, the bonus score is 0). [yacht-score-rules/spec.md](./openspec/specs/yacht-score-rules/spec.md#L89-L98)

### Q. How are the scores calculated for each category?
**A.**
* **Upper Section (Aces ~ Sixes)**: The sum of only the dice showing the corresponding number.
* **Choice**: The sum of all 5 dice values.
* **Four of a Kind**: The sum of all 5 dice values if 4 or more dice show the same value (otherwise 0).
* **Full House**: The sum of all 5 dice values if there is a three-of-a-kind and a pair, or a Yacht (5 of a kind) (otherwise 0).
* **Small Straight**: A fixed **15 points** if 4 or more dice show consecutive values (1-2-3-4, 2-3-4-5, or 3-4-5-6). (Also awarded if a Large Straight is matched).
* **Large Straight**: A fixed **30 points** if all 5 dice show consecutive values (1-2-3-4-5 or 2-3-4-5-6) (otherwise 0).
* **Yacht**: A fixed **50 points** if all 5 dice show the same value (otherwise 0).
> [!NOTE]
> Detailed calculation scenarios are documented in [yacht-score-rules/spec.md](./openspec/specs/yacht-score-rules/spec.md).

### Q. What is the maximum number of times I can roll the dice in a turn?
**A.** The active player can roll the dice up to **3 times** per turn. (First roll rolls all 5 dice, subsequent 2 rolls allow specifying which dice to hold, only rolling the unheld ones). Any attempts to roll after 3 rolls will result in a `RollLimitExceededError`. [yacht-state-machine/spec.md](./openspec/specs/yacht-state-machine/spec.md#L19-L33)

### Q. Can I select a category and end my turn without rolling the dice first?
**A.** No. The active player must roll the dice at least once before they can select a score category. Attempting to select a category with a roll count of 0 will trigger an `InvalidStateActionError`. Additionally, selecting an already filled category triggers `CategoryAlreadyFilledError`. [yacht-state-machine/spec.md](./openspec/specs/yacht-state-machine/spec.md#L34-L48)

### Q. What is the difference in turn transition between single-player and multiplayer modes?
**A.** Upon successful category selection, the roll count resets to 0 and the turn transitions:
- **Single-player (single)**: The turn remains with the same player.
- **Multiplayer (multi)**: The turn switches to the opponent player. [yacht-state-machine/spec.md](./openspec/specs/yacht-state-machine/spec.md#L49-L59)

### Q. What happens if I try to roll when all 5 dice are held?
**A.** The system prevents redundant actions. The Discord presentation layer will render the "Roll Dice" button with `disabled: true` when all 5 dice are held, and the game state machine enforces this via an `AllDiceHeldError` if bypassed. [yacht-state-machine/spec.md](./openspec/specs/yacht-state-machine/spec.md#L82-L96)

### Q. Can I surrender or forfeit an ongoing match?
**A.** Yes. Any active player can click the "Surrender" button to forfeit the match at any point, regardless of whose turn it is. The game immediately transitions to a 'Finished' state, declaring the other player the winner and calculating ELO rating changes accordingly. [yacht-state-machine/spec.md](./openspec/specs/yacht-state-machine/spec.md#L119-L133)

---

## 2. Discord Integration & Commands

### Q. What Discord slash (/) commands are supported?
**A.**
* `/challenge`: Initializes a new Yacht game. If run without options, it starts a single-player game. If an opponent option is provided, it starts a multiplayer matchmaking game. [game-orchestrator/spec.md](./openspec/specs/game-orchestrator/spec.md#L24-L34)
* `/profile`: Displays user statistics scoped to the current Discord server (guild). [game-orchestrator/spec.md](./openspec/specs/game-orchestrator/spec.md#L35-L41)
* `/leaderboard`: Displays top players for the current Discord server (guild). [game-orchestrator/spec.md](./openspec/specs/game-orchestrator/spec.md#L42-L48)
* `/history`: Displays a list of the user's 5 most recent matches played in the guild with interactive paging to view detailed turn-by-turn logs. [game-orchestrator/spec.md](./openspec/specs/game-orchestrator/spec.md#L64-L74)

### Q. Will I get notified when it is my turn in a multiplayer match?
**A.** Yes. On turn transition, the system automatically sends a notification mention message reply targeting the next player in the Discord channel, storing the message ID and channel ID in the `GameState`. [turn-mention-notification/spec.md](./openspec/specs/turn-mention-notification/spec.md#L6-L12)

### Q. Does the notification mention message persist?
**A.** No. The mention message serves as an acknowledgment (ACK) and is automatically deleted once the next player performs any turn action (such as rolling dice or toggling holds). [turn-mention-notification/spec.md](./openspec/specs/turn-mention-notification/spec.md#L13-L23)

### Q. What happens if I interact with buttons on a completed game message?
**A.** If a player clicks a button or select menu on a stale finished game, the system catches the `GameAlreadyOverError` and gracefully updates the message to reflect the finished state (removing all buttons and components) instead of displaying an error. [finished-game/spec.md](./openspec/specs/finished-game/spec.md#L22-L34)

### Q. How is Discord webhook security ensured?
**A.** Every incoming HTTP POST request from Discord is cryptographically verified using its `X-Signature-Ed25519` and `X-Signature-Timestamp` headers matching the bot's configured public key. Invalid requests are rejected with a 401 Unauthorized response. [discord-signature-verifier/spec.md](./openspec/specs/discord-signature-verifier/spec.md#L8-L22)

### Q. Can I challenge myself to a 1v1 match?
**A.** No. The `/challenge` command checks the opponent option. If you attempt to challenge yourself, the system returns an error message and blocks the game initialization. [game-orchestrator/spec.md](./openspec/specs/game-orchestrator/spec.md#L30-L34)

### Q. How is the scoreboard optimized for mobile Discord clients?
**A.** The ASCII scoreboard table is dynamically rendered to fit within a maximum width of 27 characters (with player names truncated to a max of 4 characters). This prevents ugly line wrapping. It also displays a bonus progress tracker (`currentSum/63`) for the Upper Section. [yacht-state-machine/spec.md](./openspec/specs/yacht-state-machine/spec.md#L97-L118)

---

## 3. Persistence & D1 DB Schema

### Q. How are player statistics stored and updated?
**A.** Player statistics are tracked both **per-guild (server-scoped)** and **globally**.
- The `guild_player_stats` table stores server-specific stats (completed solo games, solo highest score, multiplayer wins/losses/draws, and multiplayer highest score). [d1-database-schema/spec.md](./openspec/specs/d1-database-schema/spec.md#L50-L67)
- For backward compatibility, the global `players` table is also simultaneously updated. [persistence-repository/spec.md](./openspec/specs/persistence-repository/spec.md#L15-L15)

### Q. Is turn history saved for completed games?
**A.** Yes. When a match ends, the complete game turn history list is serialized into JSON format and saved in a dedicated `history_json` column of the `matches` table. This allows users to review round-by-round breakdown in the `/history` command later. [persistence-repository/spec.md](./openspec/specs/persistence-repository/spec.md#L58-L71)

### Q. What database does the project use?
**A.** The system uses Cloudflare D1 (a serverless SQLite database). Using `Effect.ts`, the database connection is resolved dynamically from the context Layer (`D1Database` service), decoupling repository logic from any specific database driver. [persistence-repository/spec.md](./openspec/specs/persistence-repository/spec.md#L51-L57)

### Q. How is the leaderboard ranking determined?
**A.** The leaderboard is sorted in descending order of the players' **ELO rating** (starting default is 1000) instead of raw wins, providing a more competitive matchmaking indicator. [elo-rating/spec.md](./openspec/specs/elo-rating/spec.md#L12-L21)

---

## 4. Architecture & Dev Simulator

### Q. Is there a way to test the game locally without Discord API integration?
**A.** Yes. The project includes a CLI game runner ([cli-game-runner](./openspec/specs/cli-game-runner)) which provides an interactive terminal simulator with ASCII scoreboards, roll/hold inputs, and final results announcement.

### Q. What is the project's technical stack and folder structure?
**A.**
- **Stack**: **Effect.ts** ecosystem (`effect`, `@effect/platform`, `@effect/schema`), Cloudflare Workers & D1 (`wrangler`), **Vitest** (testing), **TypeScript** [project-infra-setup/spec.md](./openspec/specs/project-infra-setup/spec.md#L6-L33)
- **Folder Structure (AGENTS.md rules)**:
  - `src/domain/`: Pure domain logic containing calculations and state machine flow (free from external side effects).
  - `src/persistence/`: Data repositories wrapping Cloudflare D1 database operations.
  - `src/presentation/`: Discord webhook entry points, signature verifier, and CLI interactive game loop.
> [!TIP]
> Refer to [AGENTS.md](./AGENTS.md) in the project root for strict architecture rules.

### Q. What should we do if a game gets stuck due to network drops or unhandled errors?
**A.** Operators can run the admin script to force-finish any stale games:
```bash
npm run patch-finished-game -- <game-id>
```
This updates the database entry to a finished state and clears active buttons, preventing the Discord channel from being locked with unresponsive components.
