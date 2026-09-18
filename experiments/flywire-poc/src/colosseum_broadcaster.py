"""
Colosseum Real-Time Live Broadcaster
Streams all 12 rounds of a Colosseum duel to Discord turn-by-turn with generous pacing (1.2s~1.5s),
showing every roll (1st, 2nd, 3rd), hold locks, category selections, dopamine gauges, and spicy dialogues.
"""

import json
import time
import threading
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional
from personas import simulate_colosseum_duel, PERSONA_SPECS

DICE_EMOJIS = ["", ":one:", ":two:", ":three:", ":four:", ":five:", ":six:"]

CATEGORIES = [
    ("Aces", "Aces"),
    ("Deuces", "Deuces"),
    ("Treys", "Treys"),
    ("Fours", "Fours"),
    ("Fives", "Fives"),
    ("Sixes", "Sixes"),
    ("Subtotal", "Subtotal"),
    ("Bonus", "Bonus(+35)"),
    ("Choice", "Choice"),
    ("FourOfAKind", "4 of a Kind"),
    ("FullHouse", "Full House"),
    ("SmallStraight", "S. Straight"),
    ("LargeStraight", "L. Straight"),
    ("Yacht", "Yacht(50)")
]

PERSONA_META = {
    "Jackpot": {"name": "Jackpot", "title": "폭주 초파리 잭팟", "emoji": "🔥", "color": 0xE67E22},
    "Newton": {"name": "Newton", "title": "상식 초파리 뉴턴", "emoji": "🧠", "color": 0x3498DB},
    "Speeder": {"name": "Speeder", "title": "질주 초파리 스피더", "emoji": "⚡", "color": 0x2ECC71},
    "Chimera": {"name": "Chimera", "title": "혼돈의 돌연변이 키메라", "emoji": "🌀", "color": 0x9B59B6}
}


def render_dopamine_gauge(dopamine: float) -> str:
    percent = min(250.0, max(0.0, dopamine))
    blocks = int(round(percent / 25.0))
    filled = "█" * min(10, blocks)
    empty = "░" * max(0, 10 - blocks)
    return f"[{filled}{empty}] {int(round(percent))}%"


def format_dice_with_locks(dice: List[int], holds: List[bool]) -> str:
    if not dice:
        return "(주사위 대기 중)"
    top = " ".join(DICE_EMOJIS[d] if 1 <= d <= 6 else f"[{d}]" for d in dice)
    bottom = " ".join("🔒" if (i < len(holds) and holds[i]) else "▫️" for i in range(len(dice)))
    return f"{top}\n{bottom}"


def format_ascii_board(
    name_a: str,
    name_b: str,
    sb_a: Dict[str, int],
    sb_b: Dict[str, int],
    total_a: int,
    total_b: int,
    bonus_a: int,
    bonus_b: int
) -> str:
    upper_cats = ["Aces", "Deuces", "Treys", "Fours", "Fives", "Sixes"]
    sum_upper_a = sum(sb_a.get(c, 0) for c in upper_cats)
    sum_upper_b = sum(sb_b.get(c, 0) for c in upper_cats)

    col_a = name_a[:5].ljust(5)
    col_b = name_b[:5].ljust(5)

    header = f"Category   | {col_a} | {col_b}"
    lines = [header, "-" * len(header)]

    for key, label in CATEGORIES:
        if key in ("Subtotal", "Choice"):
            lines.append("=" * len(header))
        lbl = label.ljust(10)
        val_a = "-"
        val_b = "-"

        if key == "Subtotal":
            val_a = f"{sum_upper_a}/63"
            val_b = f"{sum_upper_b}/63"
        elif key == "Bonus":
            val_a = "35" if bonus_a > 0 or sum_upper_a >= 63 else "0"
            val_b = "35" if bonus_b > 0 or sum_upper_b >= 63 else "0"
        else:
            if key in sb_a:
                val_a = str(sb_a[key])
            if key in sb_b:
                val_b = str(sb_b[key])

        lines.append(f"{lbl} | {val_a.rjust(5)} | {val_b.rjust(5)}")

    lines.append("-" * len(header))
    lines.append(f"Total      | {str(total_a).rjust(5)} | {str(total_b).rjust(5)}")
    return "```\n" + "\n".join(lines) + "\n```"


def patch_discord_message(channel_id: str, message_id: str, embed: Dict[str, Any], token: str) -> bool:
    url = f"https://discord.com/api/v10/channels/{channel_id}/messages/{message_id}"
    payload = json.dumps({"embeds": [embed], "components": []}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Authorization": f"Bot {token}",
            "Content-Type": "application/json"
        },
        method="PATCH"
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status == 200
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        print(f"[Colosseum Broadcaster] Discord PATCH failed ({e.code}): {body}")
        return False
    except Exception as e:
        print(f"[Colosseum Broadcaster] Discord PATCH error: {e}")
        return False


def call_worker_settle(worker_settle_url: str, payload: Dict[str, Any]) -> bool:
    req = urllib.request.Request(
        worker_settle_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status == 200
    except Exception as e:
        print(f"[Colosseum Broadcaster] Worker settle call failed: {e}")
        return False


def run_full_broadcast(
    match_id: str,
    channel_id: str,
    message_id: str,
    persona_a_id: str,
    persona_b_id: str,
    discord_token: str,
    worker_settle_url: str,
    fly_brain_url: str = ""
):
    print(f"[Colosseum Broadcaster] Starting live broadcast for match {match_id} ({persona_a_id} vs {persona_b_id})")
    duel = simulate_colosseum_duel(persona_a_id, persona_b_id)
    duel["flyUrl"] = fly_brain_url

    meta_a = PERSONA_META.get(persona_a_id, PERSONA_META["Jackpot"])
    meta_b = PERSONA_META.get(persona_b_id, PERSONA_META["Newton"])

    # 1. Opening Suspense Frame
    opening_embed = {
        "title": f"🎲 [초파리 콜로세움] 12라운드 생방송 개막! 주사위 컵 셰이킹 중...!!",
        "description": f"**{meta_a['emoji']} {meta_a['title']}** vs **{meta_b['emoji']} {meta_b['title']}**\n"
                       f"🔥 **1라운드부터 12라운드까지 모든 주사위 롤과 락 선택이 실시간으로 중계됩니다!**\n\n"
                       f"{format_ascii_board(meta_a['name'], meta_b['name'], {}, {}, 0, 0, 0, 0)}\n"
                       + (f"🔗 [3D 초파리 두뇌 실시간 관전]({fly_brain_url})\n" if fly_brain_url else ""),
        "color": 0xE67E22,
        "image": {"url": "https://media.giphy.com/media/VGoZVlR9naOZCiRLSy/giphy.gif"},
        "fields": [
            {
                "name": f"{meta_a['emoji']} {meta_a['title']}의 투척 준비",
                "value": "🎲 주사위 컵 격렬 회전 중...\n💬 \"첫 턴부터 도파민 풀악셀로 기선제압 간다 붕붕!!\"",
                "inline": False
            },
            {
                "name": f"{meta_b['emoji']} {meta_b['title']}의 투척 준비",
                "value": "🎲 공기 역학 각도 조준 중...\n💬 \"오차율 0.01%의 완벽한 족보로 응징해주마 붕.\"",
                "inline": False
            }
        ],
        "footer": {"text": "주사위가 테이블 위로 쏟아집니다... (약 1.5초 후 1라운드 1차 굴림 시작!)"}
    }
    patch_discord_message(channel_id, message_id, opening_embed, discord_token)
    time.sleep(1.5)

    sb_a: Dict[str, int] = {}
    sb_b: Dict[str, int] = {}

    # 2. Iterate through all 12 rounds
    for r_idx, round_data in enumerate(duel.get("rounds", [])):
        r_num = round_data["round"]
        a_data = round_data["a"]
        b_data = round_data["b"]

        stage_tag = "초반 탐색전"
        if 4 <= r_num <= 6:
            stage_tag = "상단 63점 사수전"
        elif 7 <= r_num <= 9:
            stage_tag = "클러치 족보 승부"
        elif r_num >= 10:
            stage_tag = "파이널 끝장 혈투"

        # --- A Turn: Rolls 1, 2, 3 ---
        rolls_a = a_data.get("rolls", [])
        for roll_idx, r_item in enumerate(rolls_a):
            roll_num = r_item.get("roll", roll_idx + 1)
            dice = r_item.get("dice", [1, 1, 1, 1, 1])
            holds = r_item.get("holds", [False] * 5)
            is_final_roll = (roll_idx == len(rolls_a) - 1)

            held_str = "전부 리롤" if not any(holds) else ("전부 고정(락)" if all(holds) else "일부 고정(락)")
            curr_sb_str = format_ascii_board(
                meta_a["name"], meta_b["name"],
                sb_a, sb_b,
                sum(sb_a.values()), sum(sb_b.values()),
                0, 0
            )
            roll_diag = a_data.get("dialogue", "붕붕~") if is_final_roll else '"신중하게 킵하고 다음 샷을 노린다 붕!"'

            roll_embed = {
                "title": f"⚔️ [초파리 콜로세움] Round {r_num}/12 ({stage_tag}) - {meta_a['emoji']} {meta_a['name']} 턴",
                "description": f"**🔴 {meta_a['emoji']} {meta_a['name']}** [{sum(sb_a.values())}점] vs **🔵 {meta_b['emoji']} {meta_b['name']}** [{sum(sb_b.values())}점]\n\n"
                               f"{curr_sb_str}\n"
                               + (f"🔗 [3D 초파리 두뇌 실시간 관전]({fly_brain_url})\n" if fly_brain_url else ""),
                "color": meta_a["color"],
                "fields": [
                    {
                        "name": f"🔴 {meta_a['title']}의 {roll_num}차 투척! (도파민: {render_dopamine_gauge(a_data.get('dopamine', 120))})",
                        "value": f"🎲 **{roll_num}차 굴림 결과**:\n{format_dice_with_locks(dice, holds)}\n"
                                 f"🔒 **락 결정**: **{held_str}**\n"
                                 f"💬 {roll_diag}",
                        "inline": False
                    },
                    {
                        "name": f"🔵 {meta_b['title']}",
                        "value": "⏳ 대기 중 (상대방 투척 관전 중)",
                        "inline": False
                    }
                ],
                "footer": {"text": f"Round {r_num}/12 | {meta_a['name']}의 {roll_num}/3차 굴림"}
            }
            patch_discord_message(channel_id, message_id, roll_embed, discord_token)
            time.sleep(1.3)

        # A Category Locked
        cat_a = a_data["category"]
        pts_a = a_data["points"]
        sb_a[cat_a] = pts_a

        cat_lock_embed_a = {
            "title": f"⚔️ [초파리 콜로세움] Round {r_num}/12 ({stage_tag}) - 🎯 {meta_a['name']} 족보 확정!",
            "description": f"**🔴 {meta_a['emoji']} {meta_a['name']}** [{sum(sb_a.values())}점] vs **🔵 {meta_b['emoji']} {meta_b['name']}** [{sum(sb_b.values())}점]\n\n"
                           f"{format_ascii_board(meta_a['name'], meta_b['name'], sb_a, sb_b, sum(sb_a.values()), sum(sb_b.values()), a_data.get('upper_bonus', 0), 0)}\n"
                           + (f"🔗 [3D 초파리 두뇌 실시간 관전]({fly_brain_url})\n" if fly_brain_url else ""),
            "color": meta_a["color"],
            "fields": [
                {
                    "name": f"🔴 {meta_a['title']}의 족보 등록 완료!",
                    "value": f"🎯 **선택 족보**: **{cat_a}** ➔ **+{pts_a}점 획득!** (누적: {a_data.get('total', sum(sb_a.values()))}점)\n"
                             f"🎲 **최종 주사위**: {format_dice_with_locks(a_data.get('dice', []), a_data.get('holds', []))}\n"
                             f"💬 {a_data.get('dialogue', '붕붕~')}",
                    "inline": False
                },
                {
                    "name": f"🔵 {meta_b['title']}",
                    "value": "🎲 다음 턴 투척 준비 중...",
                    "inline": False
                }
            ],
            "footer": {"text": f"Round {r_num}/12 | {meta_b['name']}의 턴으로 전환됩니다."}
        }
        patch_discord_message(channel_id, message_id, cat_lock_embed_a, discord_token)
        time.sleep(1.4)

        # --- B Turn: Rolls 1, 2, 3 ---
        rolls_b = b_data.get("rolls", [])
        for roll_idx, r_item in enumerate(rolls_b):
            roll_num = r_item.get("roll", roll_idx + 1)
            dice = r_item.get("dice", [1, 1, 1, 1, 1])
            holds = r_item.get("holds", [False] * 5)
            is_final_roll = (roll_idx == len(rolls_b) - 1)

            held_str = "전부 리롤" if not any(holds) else ("전부 고정(락)" if all(holds) else "일부 고정(락)")
            curr_sb_str = format_ascii_board(
                meta_a["name"], meta_b["name"],
                sb_a, sb_b,
                sum(sb_a.values()), sum(sb_b.values()),
                a_data.get("upper_bonus", 0), 0
            )
            roll_diag = b_data.get("dialogue", "붕붕~") if is_final_roll else '"오차범위를 좁혀가며 최적해를 찾는다 붕!"'

            roll_embed = {
                "title": f"⚔️ [초파리 콜로세움] Round {r_num}/12 ({stage_tag}) - {meta_b['emoji']} {meta_b['name']} 턴",
                "description": f"**🔴 {meta_a['emoji']} {meta_a['name']}** [{sum(sb_a.values())}점] vs **🔵 {meta_b['emoji']} {meta_b['name']}** [{sum(sb_b.values())}점]\n\n"
                               f"{curr_sb_str}\n"
                               + (f"🔗 [3D 초파리 두뇌 실시간 관전]({fly_brain_url})\n" if fly_brain_url else ""),
                "color": meta_b["color"],
                "fields": [
                    {
                        "name": f"🔴 {meta_a['title']} (직전 득점)",
                        "value": f"🎯 {cat_a} (+{pts_a}점)",
                        "inline": True
                    },
                    {
                        "name": f"🔵 {meta_b['title']}의 {roll_num}차 투척! (도파민: {render_dopamine_gauge(b_data.get('dopamine', 110))})",
                        "value": f"🎲 **{roll_num}차 굴림 결과**:\n{format_dice_with_locks(dice, holds)}\n"
                                 f"🔒 **락 결정**: **{held_str}**\n"
                                 f"💬 {roll_diag}",
                        "inline": False
                    }
                ],
                "footer": {"text": f"Round {r_num}/12 | {meta_b['name']}의 {roll_num}/3차 굴림"}
            }
            patch_discord_message(channel_id, message_id, roll_embed, discord_token)
            time.sleep(1.3)

        # B Category Locked & Round Concluded
        cat_b = b_data["category"]
        pts_b = b_data["points"]
        sb_b[cat_b] = pts_b

        leader_str = f"{meta_a['emoji']} {meta_a['name']} 리드!" if sum(sb_a.values()) > sum(sb_b.values()) else (
            f"{meta_b['emoji']} {meta_b['name']} 리드!" if sum(sb_b.values()) > sum(sb_a.values()) else "동점 접전!"
        )

        round_conclude_embed = {
            "title": f"⚔️ [초파리 콜로세움] Round {r_num}/12 종료 - {leader_str}",
            "description": f"**🔴 {meta_a['emoji']} {meta_a['name']}** [{sum(sb_a.values())}점] vs **🔵 {meta_b['emoji']} {meta_b['name']}** [{sum(sb_b.values())}점]\n"
                           f"⚡ **현재 전황**: **{leader_str}** (역전 횟수: {duel.get('lead_changes', 0)}회)\n\n"
                           f"{format_ascii_board(meta_a['name'], meta_b['name'], sb_a, sb_b, sum(sb_a.values()), sum(sb_b.values()), a_data.get('upper_bonus', 0), b_data.get('upper_bonus', 0))}\n"
                           + (f"🔗 [3D 초파리 두뇌 실시간 관전]({fly_brain_url})\n" if fly_brain_url else ""),
            "color": 0xF1C40F if r_num == 12 else 0x5865F2,
            "fields": [
                {
                    "name": f"🔴 {meta_a['title']} R{r_num} 득점",
                    "value": f"🎯 {cat_a} (+{pts_a}점) | 누적 {a_data.get('total', sum(sb_a.values()))}점",
                    "inline": True
                },
                {
                    "name": f"🔵 {meta_b['title']} R{r_num} 득점",
                    "value": f"🎯 {cat_b} (+{pts_b}점) | 누적 {b_data.get('total', sum(sb_b.values()))}점\n💬 {b_data.get('dialogue', '붕붕~')}",
                    "inline": True
                }
            ],
            "footer": {
                "text": f"Round {r_num}/12 완료 | 다음 라운드로 진행 중..." if r_num < 12 else "12라운드 혈투 종료! 최종 결과를 집계 및 정산 중입니다..."
            }
        }
        patch_discord_message(channel_id, message_id, round_conclude_embed, discord_token)
        time.sleep(1.4)

    # 3. Final Settlement: Call Worker to settle DB & show podium
    settle_payload = {
        "match_id": match_id,
        "channel_id": channel_id,
        "message_id": message_id,
        "winner": duel.get("winner", "A"),
        "score_a": duel.get("score_a", 0),
        "score_b": duel.get("score_b", 0),
        "duel_data": duel
    }
    print(f"[Colosseum Broadcaster] Match {match_id} completed. Calling Worker settle at {worker_settle_url}")
    call_worker_settle(worker_settle_url, settle_payload)


def start_colosseum_broadcast_async(
    match_id: str,
    channel_id: str,
    message_id: str,
    persona_a_id: str,
    persona_b_id: str,
    discord_token: str,
    worker_settle_url: str,
    fly_brain_url: str = ""
):
    t = threading.Thread(
        target=run_full_broadcast,
        args=(match_id, channel_id, message_id, persona_a_id, persona_b_id, discord_token, worker_settle_url, fly_brain_url),
        daemon=True
    )
    t.start()
    return t
