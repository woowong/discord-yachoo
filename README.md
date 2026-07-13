# Discord Yacht Dice Bot (`discord-yachoo`)

[![Language](https://img.shields.io/badge/Language-TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![Runtime](https://img.shields.io/badge/Runtime-Cloudflare%20Workers-orange.svg)](https://workers.cloudflare.com/)
[![Framework](https://img.shields.io/badge/Framework-Effect.ts-lightgrey.svg)](https://effect.website/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A serverless Discord bot for playing the **Yacht Dice** (Yacht / Yahtzee) game, built on **Cloudflare Workers** using the **Effect.ts** functional programming ecosystem and **Cloudflare D1** serverless SQLite database.

> **Korean Version Available:** Please refer to [README.ko.md](./README.ko.md) for the Korean documentation.

---

## Key Features

- **Serverless & Webhook-based:** Runs entirely on Cloudflare Workers using Discord's Webhook Interactions. No persistent websocket connections needed, keeping execution costs at zero (under the free tier).
- **Interactive UI Components:** Play the game directly inside Discord chat threads using rich embeds, select menus, and buttons.
- **Dual-mode Gameplay:** Supports both Single-player (solo score attack) and Multi-player (1v1 duel) match options.
- **ELO Rating & Leaderboard:** Tracks competitive player ratings (ELO) for multiplayer games, displaying ratings in profiles and sorting the guild leaderboard by ELO.
- **Surrender & Safety Controls:** Allows players to forfeit an active game at any point. Prevents self-challenging and blocks redundant rolls when all 5 dice are held.
- **Mobile-Optimized Presentation:** Renders the ASCII scoreboard within 27 characters to prevent line wrapping on mobile clients, with player name truncation and a bonus progress tracker (`current/63`).
- **Pure Game Engine:** All core business logic (dice rolling, score calculations, game turns) is written in pure functions, making it 100% testable.
- **Local CLI Simulator:** Test and play the game directly in your local terminal without deploying to Discord or Cloudflare.

---

## Tech Stack

- **Core Runtime:** [Cloudflare Workers](https://workers.cloudflare.com/)
- **Database:** [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite)
- **Functional Programming:** [Effect.ts](https://effect.website/) (safe error handling, tag-based dependency injection)
- **Testing:** [Vitest](https://vitest.dev/)
- **CLI Development:** [tsx](https://github.com/privatenumber/tsx) & [TypeScript 7.0](https://www.typescriptlang.org/)

---

## Project Architecture

This project strictly isolates the domain business logic from infrastructural side effects (as defined in [AGENTS.md](./AGENTS.md)):

```
┌─────────────────────────────────────────────────────────┐
│                 Presentation Layer                      │
│   (Discord Webhook Handler / Local Console Simulator)   │
└────────────────────────────┬────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────┐
│                  Core Game Engine                       │
│    (Pure Domain Logic: score calculation & state machine)│
└────────────────────────────┬────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────┐
│                  Persistence Layer                      │
│          (D1 Database / In-Memory Store)               │
└─────────────────────────────────────────────────────────┘
```

- **Core Game Engine (`src/domain/`)**: Pure functions for game flow. Completely independent of Discord, HTTP, or Databases.
- **Presentation Layer (`src/presentation/`)**:
  - `discord/`: Translates game states into Discord embeds, action rows, and button payloads. Handles webhook signature verification and parsing.
  - `console/`: A readline-based console UI for terminal simulation.
- **Persistence Layer (`src/persistence/`)**: Manages player profiles, historical records, and active sessions. Abstracted behind repository tags.

---

## Local Development & Simulation

### 1. Installation
Install the project dependencies (TypeScript 7.0+ & Effect.ts 3.x+):
```bash
npm install
```

### 2. Run Local CLI Simulator
You can simulate the entire game loop in your local terminal:
```bash
npm run simulate
```

### 3. Running Tests
Run Vitest to verify all units and integration flows:
```bash
npm run test
```

### 4. Local Web Server (Wrangler)
To run a local mock worker server for testing integration:
```bash
npm run dev
```

---

## Deployment Guide

### 1. Register Discord Slash Commands
First, configure your Discord Application credentials in your terminal environment and run the command registrar:
```bash
DISCORD_APP_ID="your_app_id" \
DISCORD_TOKEN="your_bot_token" \
DISCORD_GUILD_ID="optional_test_guild_id" \
npm run register-commands
```

### 2. Configure Cloudflare D1 Database
Create the production D1 database:
```bash
npx wrangler d1 create yacht_dice
```
Run the migrations to set up schema tables on the D1 database:
```bash
# For local development database
npx wrangler d1 migrations apply yacht_dice --local

# For remote production database
npx wrangler d1 migrations apply yacht_dice --remote
```

Update your `wrangler.toml` with the generated `database_id`.

### 3. Deploy to Cloudflare Workers
Deploy your worker using wrangler:
```bash
npx wrangler deploy
```

### 4. Link Webhook URL in Discord Developer Portal
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Under your Application's **General Information**, set the **Interactions Endpoint URL** to your deployed worker URL (e.g. `https://discord-yachoo.<your-subdomain>.workers.dev`).
3. Set your `DISCORD_PUBLIC_KEY` secret on the Cloudflare worker so it can authenticate incoming Discord requests:
   ```bash
   npx wrangler secret put DISCORD_PUBLIC_KEY
   ```

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
