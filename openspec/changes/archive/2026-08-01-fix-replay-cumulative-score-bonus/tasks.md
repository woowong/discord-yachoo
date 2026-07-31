## 1. Domain History Model

- [x] 1.1 Add a required `cumulativeScore` field to new `TurnRecord` values and update all TypeScript fixtures that construct turn records.
- [x] 1.2 Update category selection in the pure game engine to record the updated player's bonus-inclusive `totalScore` after each turn.
- [x] 1.3 Add a pure history normalization/reconstruction helper that orders turns per player, derives missing cumulative scores, and applies the 35-point upper section bonus at the threshold-crossing turn.
- [x] 1.4 Add domain tests for cumulative scores before the threshold, on the threshold-crossing turn, and on subsequent turns after the bonus is earned.

## 2. History Consumers

- [x] 2.1 Update Discord history detail serialization to display each turn's gained score and normalized cumulative score, including legacy history fallback behavior.
- [x] 2.2 Update legend-match round reconstruction to use normalized bonus-inclusive cumulative scores for comeback analysis while retaining raw turn scores for streak/Yacht tags.
- [x] 2.3 Update the web replay table to render stored or derived cumulative scores rather than summing raw turn scores in the browser.
- [x] 2.4 Update the web replay score-difference column and round delta chart to use bonus-inclusive cumulative scores and carry forward the previous score when a player has not acted in a round.
- [x] 2.5 Add presentation and replay regression tests covering Discord history output, legacy history without `cumulativeScore`, the web cumulative-score markup, and the bonus-triggering delta.

## 3. Legacy Match Score Repair

- [x] 3.1 Extract or organize pure score reconstruction logic for legacy match history so it prefers stored cumulative scores and otherwise derives the final score with the upper bonus.
- [x] 3.2 Change the repair command to default to dry-run output, require an explicit apply mode for D1 updates, and print before/after scores and winner changes.
- [x] 3.3 Preserve surrender outcomes while repairing summary scores, and ensure valid `raw turn sum + 35` records are never lowered to the raw sum.
- [x] 3.4 Add unit tests for normal matches, bonus matches, legacy records without cumulative fields, equal scores, and surrendered matches.

## 4. Verification and Rollout

- [x] 4.1 Verify that newly saved `history_json` includes cumulative scores without requiring a database schema migration, and add or update persistence coverage as needed.
- [x] 4.2 Run the full Vitest suite and TypeScript typecheck; resolve regressions from the expanded `TurnRecord` shape.
- [x] 4.3 Run OpenSpec validation and execute the repair command in local/staging dry-run mode before any production apply run.
