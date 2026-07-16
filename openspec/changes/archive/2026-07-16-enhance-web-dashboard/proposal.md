## Why

- **Lack of Player Directory**: Users do not know the numeric Discord User IDs of other players, making it difficult to search and view their profiles on the Web Dashboard.
- **Disconnected User Experience**: Player names in match histories and turn replays are static text, preventing users from clicking them to navigate directly to their stats card.
- **Unsorted Legend Matches**: All legendary matches are listed together without classification, making it hard to find specific highlights (like Yachts or Comebacks).
- **Suboptimal Spatial Layout**: The initial Web UI dashboard uses large paddings and heights, leading to extensive vertical scrolling, especially in lists and tables.

## What Changes

- **Active Player Directory API**: Expose a new API endpoint `GET /web/api/players` to fetch a list of registered players sorted by ELO rating, allowing the dashboard to list them.
- **Active Player List UI**: Display a horizontal list/grid of player chips on the profile search page, allowing users to click a player to view their profile instantly.
- **Cross-linking Nicknames**: Wrap player names in match history lists and turn-by-turn logs in clickable links, triggering `searchProfile(playerId)` on click.
- **Legend Match Filtering**: Add filter buttons (`All`, `Yacht`, `Comeback`, `Streak`, `Fail`) above the Legend matches grid, filtering the cards using client-side JS.
- **Compact UI Design**: Restructure the CSS design token system to reduce card padding, search input dimensions, modal widths, and table row heights.

## Capabilities

### New Capabilities
*(None)*

### Modified Capabilities
- `web-dashboard`: Update requirements to include player directory listing, interactive profile links on nicknames, tag-based legend filters, and a compact UI layout.
- `persistence-repository`: Update requirements to include a method `getAllPlayers` in `PlayerRepository` for listing registered users with their ELO ratings.

## Impact

- **Affected Code**:
  - [repository.ts](file:///Users/woowong/private/discord-yachoo/src/persistence/repository.ts), [repository.ts](file:///Users/woowong/private/discord-yachoo/src/persistence/d1/repository.ts) (adding `getAllPlayers` to repository interface and D1 query implementation)
  - [router.ts](file:///Users/woowong/private/discord-yachoo/src/presentation/web/router.ts) (adding route `/web/api/players` to fetch and return the registered players list)
  - [dashboardHtml.ts](file:///Users/woowong/private/discord-yachoo/src/presentation/web/dashboardHtml.ts) (updating HTML/CSS/JS with compact styles, tag filters, user chips, and name link tags)
- **Database**: Reads from D1 `players` table (no schema modifications or migrations needed).
- **APIs**: Exposes a new `GET /web/api/players` endpoint.
