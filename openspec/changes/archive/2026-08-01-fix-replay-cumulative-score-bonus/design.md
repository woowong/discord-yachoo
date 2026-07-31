## Context

`PlayerState.totalScore` already represents the authoritative score, including the upper section bonus. However, a `TurnRecord` currently stores only the points assigned to the selected category. The same history JSON is consumed by the Discord history serializer, the web replay table, the replay delta chart, the legend-match analyzer, and the legacy score repair script, so each consumer currently has an opportunity to calculate a different total.

The change is additive to the JSON history shape. Existing rows may not contain `cumulativeScore`, and no new D1 column is required.

## Goals / Non-Goals

**Goals:**

- Make new turn records carry the authoritative, bonus-inclusive cumulative score.
- Make all replay and history consumers use the same cumulative-score semantics.
- Preserve correct displays for legacy history JSON without the new field.
- Prevent data repair from lowering legitimate bonus-inclusive match summaries.
- Provide a dry-run-first repair path and pure score reconstruction logic that can be unit tested without D1 or Wrangler.

**Non-Goals:**

- Adding a separate turn-history table or changing the `matches` table schema.
- Recalculating player leaderboard statistics from every historical match.
- Changing the rules or amount of the upper section bonus.
- Adding real-time replay visualization to active games.

## Decisions

### 1. Store cumulative score on each new turn record

`selectCategory` will create the turn record from the already-updated player state and persist `updatedPlayer.totalScore` as `cumulativeScore`. This keeps the domain engine as the single source of truth and ensures the bonus is recorded exactly on the turn where the upper section sum reaches 63.

Alternatives considered:

- Re-summing `score` in every consumer: rejected because it duplicates bonus rules and already caused the current bug.
- Storing only a match-level bonus field: rejected because replay rows and round deltas need to know when the bonus became effective.

### 2. Normalize legacy history at the consumption boundary

New `TurnRecord` values will require `cumulativeScore`. A pure history normalization/reconstruction helper will handle JSON records that lack it. For each player, it will process records in turn order, add the category score, track the six upper-category scores, and add 35 points once the upper sum reaches 63. If a stored cumulative score exists, it will be treated as authoritative for that record; missing values will be derived without mutating the stored JSON.

The same fallback semantics will be implemented in browser-side replay code because the dashboard is served as a self-contained HTML document and cannot import the server-side TypeScript helper directly.

### 3. Use normalized cumulative scores everywhere

- Discord history details will display `score` as the turn gain and normalized `cumulativeScore` as the turn total.
- The web table will render the normalized cumulative score instead of incrementing a local raw-score accumulator.
- The web score-difference column and round delta chart will compare normalized cumulative scores. For a round where one player has not acted yet, the previous cumulative score will be carried forward.
- Legend-match comeback detection will use normalized round-end cumulative scores, while hot-streak and Yacht tags will continue to use individual turn scores.

### 4. Make legacy score repair safe and testable

The score reconstruction used by `scripts/fix-legacy-match-scores.ts` will be extracted or organized around a pure function. It will prefer stored cumulative values and otherwise derive the final score with the upper bonus. The repair command will report candidate changes in dry-run mode and require an explicit apply mode for D1 updates. Normal multiplayer winner calculation will use reconstructed final scores; surrender records will preserve their existing surrender outcome semantics.

This prevents the previous false mismatch where `summaryScore === rawTurnSum + 35` was incorrectly patched down to `rawTurnSum`.

### 5. Keep history JSON backward compatible

No migration will rewrite every existing `history_json` row. New records will contain the field, while old records remain readable through normalization. A separate repair run can correct summary columns after a dry-run review. This limits deployment risk and avoids making a presentation fix depend on a bulk JSON rewrite.

## Risks / Trade-offs

- **Risk:** Legacy history may contain incomplete or malformed records. → **Mitigation:** Treat missing cumulative fields as derivable only from valid turn/category data, keep the existing display fallback, and skip/report records that cannot be reconstructed.
- **Risk:** A repair run could change production match scores or winners. → **Mitigation:** Default to dry-run, require explicit apply mode, print before/after values, and preserve surrender outcomes.
- **Risk:** Browser fallback logic could diverge from server-side normalization. → **Mitigation:** Document the same ordered reconstruction algorithm, cover both implementations with equivalent fixtures, and prefer stored cumulative values whenever available.
- **Risk:** Existing tests and fixtures construct `TurnRecord` values without the new field. → **Mitigation:** Update fixtures and add a focused domain test proving the bonus-triggering turn and subsequent turn values.

## Migration Plan

1. Update the domain record shape, normalization logic, serializers, dashboard rendering, analyzer, and tests.
2. Deploy the additive reader/writer code; old history remains readable and new games begin storing cumulative scores.
3. Run the repair command in dry-run mode against local/staging data and inspect all candidates, especially records with a 35-point raw/history difference.
4. Run explicit apply mode only after the candidate output is reviewed, then verify summary scores and winners for repaired records.
5. If a repair result is incorrect, restore the affected summary columns from the captured dry-run output or database backup. The application rollback itself remains safe because the JSON field is additive.
