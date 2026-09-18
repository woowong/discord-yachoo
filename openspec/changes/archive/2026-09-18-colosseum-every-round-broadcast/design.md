# Design: Colosseum Every Round Live Broadcast

## Architecture & Timing Budget
To provide a true turn-by-turn spectator experience without exceeding Cloudflare Worker's 30-second `ctx.waitUntil` execution budget or triggering Discord's rate limits:

1. **Opening Suspense Frame**:
   - `serializeColosseumRolling(match, bets, duelData, 1, flyBrainUrl)`: Giphy dice roll GIF, tension dialogue, empty initial board.
   - Delay: `1.5s`
2. **12 Individual Round Broadcast Frames (`serializeColosseumRound`)**:
   - For `r = 1` to `12`:
     - Calculate board state up to round `r`:
       - `sbA`: categories scored by Persona A through round `r`
       - `sbB`: categories scored by Persona B through round `r`
       - `upper_bonus` and subtotal evaluated at round `r`
     - Embed contains:
       - Header: `Round r/12` and current leader indicator
       - Current ASCII Scoreboard filling line-by-line
       - Persona A: Final Dice emojis + Hold Locks (`🔒`), chosen category (+points), dopamine gauge, dialogue
       - Persona B: Final Dice emojis + Hold Locks (`🔒`), chosen category (+points), dopamine gauge, dialogue
     - Delay: `1.2s` per round
3. **Final Result & Settlement Frame**:
   - `serializeColosseumResult`: Final podium, score difference, net Elo changes for bettors.
   - Settle in D1 and edit final message.

## Timing Math
$$\begin{aligned}
T_{\text{sleep}} &= 1.5\text{s (Opening)} + 12 \times 1.2\text{s (Rounds)} = 15.9\text{s} \\
T_{\text{http}} &\approx 14 \text{ edits} \times 0.35\text{s} \approx 4.9\text{s} \\
T_{\text{init}} &\approx 1.0\text{s} \\
T_{\text{total}} &\approx 21.8\text{s} \ll 30.0\text{s}
\end{aligned}$$
Rate per edit: $\approx 1.55\text{s}$ per message edit, well below Discord's 5 edits / 5s route bucket limit.
