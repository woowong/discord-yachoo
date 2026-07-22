import { execSync } from "child_process";

interface DBMatchRow {
  id: string;
  mode: string;
  guild_id: string | null;
  player1_id: string;
  player2_id: string | null;
  player1_score: number;
  player2_score: number | null;
  winner_id: string | null;
  history_json: string | null;
}

interface TurnRecord {
  turnNumber: number;
  playerIndex: number;
  playerName: string;
  category: string;
  score: number;
}

function runMigration(isRemote: boolean) {
  const envFlag = isRemote ? "--remote" : "--local";
  console.log(`🔍 [Migration] Fetching matches from D1 (${isRemote ? "REMOTE / Production" : "LOCAL"})...`);

  const selectCmd = `npx wrangler d1 execute yacht_dice ${envFlag} --json --command "SELECT id, mode, guild_id, player1_id, player2_id, player1_score, player2_score, winner_id, history_json FROM matches WHERE history_json IS NOT NULL;"`;
  
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
        const turns: TurnRecord[] = JSON.parse(match.history_json);
        let actualP1 = 0;
        let actualP2 = 0;

        turns.forEach((t) => {
          if (t.playerIndex === 0) actualP1 += t.score;
          if (t.playerIndex === 1) actualP2 += t.score;
        });

        const p2ScoreOrZero = match.player2_score ?? 0;

        // Check if there is an inconsistency between summary columns and turn history sum
        const isP1Mismatch = match.player1_score !== actualP1;
        const isP2Mismatch = match.mode === "multi" && p2ScoreOrZero !== actualP2;

        if (isP1Mismatch || isP2Mismatch) {
          let actualWinnerId: string | null = null;
          if (match.mode === "multi" && match.player2_id) {
            if (actualP1 > actualP2) actualWinnerId = match.player1_id;
            else if (actualP2 > actualP1) actualWinnerId = match.player2_id;
            else actualWinnerId = null;
          } else {
            actualWinnerId = match.player1_id;
          }

          console.log(`⚠️ Mismatch found in match [${match.id}]:`);
          console.log(`   DB Score: P1=${match.player1_score}, P2=${match.player2_score}, Winner=${match.winner_id}`);
          console.log(`   History Sum: P1=${actualP1}, P2=${actualP2}, Winner=${actualWinnerId}`);

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
runMigration(isRemote);
