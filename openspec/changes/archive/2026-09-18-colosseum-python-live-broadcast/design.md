# Design: Colosseum Full Roll-by-Roll Live Broadcast via Python SNN Server

## System Flow & Architecture

```
[Discord User] --(Click Start Duel)--> [Cloudflare Worker]
                                             |
                   (POST /api/fly/colosseum/broadcast)
                                             v
                                  [Python SNN Server (PM2)]
                                    - simulate_colosseum_duel()
                                    - Threading background job
                                    - Discord API PATCH loop (1.2s~1.5s/roll)
                                             |
                               (Streams ~80 roll & category frames)
                                             v
                                  [Discord Message Updated Live]
                                             |
                                  (On Match Finished)
                                             v
                                  [Worker: POST /api/colosseum/settle]
                                    - Updates D1 colosseum_matches
                                    - Distributes Elo payouts
                                    - Posts final podium embed
```

## Roll Frame Composition
Each turn frame contains:
1. Embed Title: `⚔️ [초파리 콜로세움] Round R/12 - 🔴 {FlyName} 주사위 투척 중!`
2. Description:
   - Current Score: `Fly A [pts] vs Fly B [pts]`
   - Full ASCII Scoreboard (Subtotal/63, Bonus, filled rows so far)
3. Fields:
   - Field 1 (Active Roller):
     `🎲 2차 굴림 결과: ⚄ ⚄ ⚃ ⚂ ⚂`
     `🔒 킵한 주사위: 🔒 🔒 ▫️ ▫️ ▫️`
     `💬 "도파민 140%... 5번 두 개 킵하고 풀하우스 노린다 붕!"`
   - Field 2 (Opponent):
     `상태: 대기 중 (상대방 투척 관전 중)`
4. Delay per frame: `1.2s ~ 1.5s` (guarantees strictly $\le 0.8$ requests/sec, well under Discord's 5 req / 5s rate limit).
