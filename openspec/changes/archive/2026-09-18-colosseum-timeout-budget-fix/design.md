# Design: Colosseum Execution Budget & Timeout Fix

## Architectural Context
Cloudflare Workers enforcing a strict 30-second execution cap on `ctx.waitUntil` tasks means that multi-frame Discord message editing sequences must carefully budget wall-clock time:

$$T_{\text{total}} = T_{\text{init\_fetch}} + \sum (T_{\text{sleep\_rolling}} + T_{\text{sleep\_clash}}) + N_{\text{edits}} \times T_{\text{api\_latency}} + T_{\text{d1\_settlement}} < 30.0\text{s}$$

## Pacing Configuration
- **Initial Duel Fetch**: ~1.0s
- **Acts 1, 2, 3**:
  - Rolling Stage: 2.0s sleep (renders rolling GIF + cup shaking text + current ASCII score)
  - Clash Stage: 2.5s sleep (renders dice locks, locked category, dopamine dialogue)
  - Subtotal per act = 4.5s
- **Act 4**:
  - Rolling Stage: 2.0s sleep
  - Clash Stage: 1.5s sleep (footer: "최종 결과 및 ELO 정산을 집계 중입니다...")
  - Subtotal for Act 4 = 3.5s
- **Final Settlement & Result**:
  - D1 update + payout calculations: ~0.5s
  - Edit message with podium & ELO payouts: ~0.3s
- **Total Wall-Clock Time**:
  $$1.0 + (3 \times 4.5) + 3.5 + (9 \times 0.35) + 0.5 \approx 21.65\text{s}$$
  Leaving an 8.35s margin of safety.
