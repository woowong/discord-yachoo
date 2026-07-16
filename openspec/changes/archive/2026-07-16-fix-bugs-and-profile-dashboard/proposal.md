## Why

- **Discord Mentions Broken**: Currently, gameplay notifications (e.g. teasing/celebration messages) fail to mention users correctly in Discord because they use the player's nickname (e.g., `<@꼬았>`) instead of their numerical Discord User ID.
- **Surrender Broken in Single Mode**: Clicking "실제 기권하기" fails with `Game ID not found in message` because the confirmation button is sent in an ephemeral message without the embedded Game ID footer.
- **Engaging Player Metrics & Content**: Players want to see their overall skill metrics (average scores, recent 10-match trends) and review spectacular gameplays (legendary comebacks, high streak scores, yachts) to increase game engagement and competition.
- **Web Interface for Complex Views**: While Discord is great for quick commands, viewing rich turn-by-turn logs of past games, average score charts, and a collection of legendary games is much better suited for a clean, high-performance web dashboard served directly by the Cloudflare Worker using D1.

## What Changes

- **Fix Teasing Mentions**: Modify teasing/celebration templates to receive and render the actual numerical User ID of the player (e.g., `<@123456789012345678>`) for correct user tagging in Discord.
- **Fix Surrender Custom ID**: Modify the surrender confirmation button custom ID to include the Game ID (e.g., `confirm_surrender_${gameId}_${targetMessageId}`) and adapt the routing middleware to extract the Game ID from the custom ID when matching this pattern.
- **Enhanced Profile Command**: Add overall average score (solo & multi) and recent 10-match streak indicators (e.g., `🟩 🟩 🟥 🟩 ... (7W 3L)`) to the Discord `/profile` command.
- **Cloudflare Worker Web Pages**: Implement routing in the Cloudflare Worker fetch handler to serve static Web Dashboard HTML/CSS/JS and APIs under `/web/*` and `/` without requiring Discord signature headers.
- **API Endpoints**: Serve player profiles, leaderboards, and legend matches as JSON endpoints.
- **Legend Match Scanner**: Categorize games based on criteria like "막판 역전" (come-from-behind win), "고득점 연속" (5+ consecutive high-scoring turns), "야추 달성" (Yacht 50 points), and "연속 뇌절" (3+ consecutive zero-point turns) by parsing the match history JSON.

## Capabilities

### New Capabilities
- `web-dashboard`: Covers serving a modern, glassmorphism dark-themed Web Dashboard and matching JSON API endpoints (`/web/api/...`) from the Cloudflare Worker.
- `profile-stats`: Covers calculating overall average scores (separated by solo/multi), win/loss lists, and categorizing matches into "Legend Matches" (comeback wins, hot streaks, yacht occurrences, epic fails).

### Modified Capabilities
- `turn-mention-notification`: Update requirements to specify that teasing, celebration, and other inline gameplay notifications must use numerical User IDs for Discord mentions.
- `game-orchestrator`: Update the surrender/forfeit flow requirements to carry the Game ID in the interaction's custom ID, ensuring state resolution is possible from ephemeral messages.

## Impact

- **Affected Code**: 
  - [router.ts](file:///Users/woowong/private/discord-yachoo/src/presentation/discord/router.ts), [index.ts](file:///Users/woowong/private/discord-yachoo/src/index.ts) (routing and Game ID extraction logic)
  - [ko.ts](file:///Users/woowong/private/discord-yachoo/src/presentation/messages/ko.ts) (teasing notification user parameter)
  - [commands.ts](file:///Users/woowong/private/discord-yachoo/src/presentation/discord/handlers/commands.ts), [components.ts](file:///Users/woowong/private/discord-yachoo/src/presentation/discord/handlers/components.ts) (profile payload format, surrender target/game ID extraction)
- **Infrastructure**: Additional routing paths in Wrangler/Cloudflare Worker configurations if necessary (none required, as `*` goes to Worker fetch).
- **APIs**: New GET endpoints under `/web/api/...` for dashboard data consumption.
