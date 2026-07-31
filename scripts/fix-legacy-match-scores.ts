import { execSync } from "child_process";
import { HistoryTurnRecord } from "../src/domain/history";
import { reconstructMatchScores } from "../src/application/matchHistoryRepair";

interface DBMatchRow {
  id: string;
  mode: string;
  guild_id: string | null;
  player1_id: string;
  player2_id: string | null;
  player1_score: number;
  player2_score: number | null;
  winner_id: string | null;
  surrendered_id: string | null;
  history_json: string | null;
}

function runMigration(isRemote: boolean, shouldApply: boolean) {
  const envFlag = isRemote ? "--remote" : "--local";
  console.log(`🔍 [Migration] Fetching matches from D1 (${isRemote ? "REMOTE / Production" : "LOCAL"})...`);
  console.log(`🔎 Mode: ${shouldApply ? "APPLY changes" : "DRY-RUN only"}`);

  const selectCmd = `npx wrangler d1 execute yacht_dice ${envFlag} --json --command "SELECT id, mode, guild_id, player1_id, player2_id, player1_score, player2_score, winner_id, surrendered_id, history_json FROM matches WHERE history_json IS NOT NULL;"`;
  
  try {
    const rawOutput = execSync(selectCmd, { encoding: "utf-8" });
    const parsed = JSON.parse(rawOutput);

    if (!parsed || parsed.length === 0 || !parsed[0].results) {
      console.log("No match records found.");
      return;
    }

    const matches: DBMatchRow[] = parsed[0].results;
    console.log(`Found ${matches.length} matches with historyJson.`);

    let patchCount = 0;
    const updateStatements: string[] = [];

    for (const match of matches) {
      if (!match.history_json) continue;

      try {
        const turns = JSON.parse(match.history_json) as HistoryTurnRecord[];
        const reconstructed = reconstructMatchScores({
          mode: match.mode as "single" | "multi",
          player1Id: match.player1_id,
          player2Id: match.player2_id,
          surrenderedId: match.surrendered_id,
          winnerId: match.winner_id,
          history: turns
        });
        const actualP1 = reconstructed.player1Score;
        const actualP2 = reconstructed.player2Score ?? 0;

        const p2ScoreOrZero = match.player2_score ?? 0;

        // Check if there is an inconsistency between summary columns and turn history sum
        const isP1Mismatch = match.player1_score !== actualP1;
        const isP2Mismatch = match.mode === "multi" && p2ScoreOrZero !== actualP2;

        if (isP1Mismatch || isP2Mismatch) {
          const actualWinnerId = reconstructed.winnerId;
          if (match.surrendered_id) {
            console.log(`   Preserving surrender winner: ${actualWinnerId || "NULL"}`);
          }

          console.log(`⚠️ Mismatch found in match [${match.id}]:`);
          console.log(`   DB Score: P1=${match.player1_score}, P2=${match.player2_score}, Winner=${match.winner_id}`);
          console.log(`   History Final Cumulative: P1=${actualP1}, P2=${actualP2}, Winner=${actualWinnerId}`);

          const winnerSql = actualWinnerId ? `'${actualWinnerId}'` : "NULL";
          const p2Sql = match.mode === "multi" ? actualP2 : "NULL";
          
          updateStatements.push(
            `UPDATE matches SET player1_score = ${actualP1}, player2_score = ${p2Sql}, winner_id = ${winnerSql} WHERE id = '${match.id}';`
          );
          patchCount++;
        }
      } catch (err) {
        console.error(`Failed to parse historyJson for match [${match.id}]:`, err);
      }
    }

    if (patchCount === 0) {
      console.log("✅ All matches are consistent! No patches required.");
      return;
    }

    console.log(`\nFound ${patchCount} inconsistent match records to patch.`);

    if (!shouldApply) {
      console.log("\n🛑 Dry-run complete. No database updates were executed.");
      console.log("Run again with --apply to execute the printed updates.");
      return;
    }

    for (const sql of updateStatements) {
      console.log(`Executing: ${sql}`);
      const updateCmd = `npx wrangler d1 execute yacht_dice ${envFlag} --command "${sql.replace(/"/g, '\\"')}"`;
      execSync(updateCmd, { encoding: "utf-8", stdio: "inherit" });
    }

    console.log(`\n🎉 Successfully patched ${patchCount} match records in D1 (${isRemote ? "REMOTE" : "LOCAL"})!`);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

const isRemote = process.argv.includes("--remote");
const shouldApply = process.argv.includes("--apply");
runMigration(isRemote, shouldApply);
