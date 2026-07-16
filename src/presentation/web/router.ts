import { Effect, Option } from "effect";
import { PlayerRepository, MatchRepository } from "../../persistence/repository";
import { DASHBOARD_HTML } from "./dashboardHtml";
import { scanLegendMatch } from "../../application/LegendMatches";

export const handleWebRequest = (request: Request) =>
  Effect.gen(function* () {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 1. Serve HTML dashboard
    if (pathname === "/" || pathname === "/web" || pathname === "/web/") {
      return new Response(DASHBOARD_HTML, {
        headers: { "content-type": "text/html; charset=utf-8" }
      });
    }

    const playerRepo = yield* PlayerRepository;
    const matchRepo = yield* MatchRepository;

    // 2. API: Match detail (replays)
    if (pathname.startsWith("/web/api/profile/match/")) {
      const matchId = pathname.substring("/web/api/profile/match/".length);
      const matchOpt = yield* matchRepo.getMatchById(matchId);
      if (Option.isNone(matchOpt)) {
        return new Response(JSON.stringify({ error: "Match not found" }), {
          status: 404,
          headers: { "content-type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ match: matchOpt.value }), {
        headers: { "content-type": "application/json" }
      });
    }

    // 3. API: Player profile
    if (pathname.startsWith("/web/api/profile/")) {
      const playerId = pathname.substring("/web/api/profile/".length);
      const guildId = url.searchParams.get("guildId") || null;

      const statsOption = yield* playerRepo.getPlayer(playerId, guildId);
      if (Option.isNone(statsOption)) {
        return new Response(JSON.stringify({ error: "Player not found" }), {
          status: 404,
          headers: { "content-type": "application/json" }
        });
      }

      const recentMatches = yield* matchRepo.getRecentMatches(playerId, guildId, 10);
      const avgSoloScore = yield* matchRepo.getPlayerAverageScore(playerId, guildId, "single");
      const avgMultiScore = yield* matchRepo.getPlayerAverageScore(playerId, guildId, "multi");

      return new Response(
        JSON.stringify({
          stats: statsOption.value,
          recent: recentMatches,
          avgSoloScore,
          avgMultiScore
        }),
        { headers: { "content-type": "application/json" } }
      );
    }

    // 4. API: Legend matches catalog
    if (pathname === "/web/api/legend" || pathname === "/web/api/legend/") {
      const guildId = url.searchParams.get("guildId") || null;
      
      // Load last 50 matches and scan for tags
      const matches = yield* matchRepo.getGlobalRecentMatches(guildId, 50);
      const legendMatches = matches
        .map((match) => {
          const tags = scanLegendMatch(match);
          return { match, tags };
        })
        .filter((res) => res.tags.length > 0);

      return new Response(JSON.stringify(legendMatches), {
        headers: { "content-type": "application/json" }
      });
    }

    // Fallback 404
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "content-type": "application/json" }
    });
  });
