import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

NOTION_PARENT_PAGE_ID = "3b6a6abe-c85c-8083-bd48-cf5d4674ae6c"
REPORTS_DIR = Path(__file__).resolve().parent.parent / "data" / "notion_reports"


def build_rich_text(content: str, bold: bool = False, italic: bool = False, code: bool = False, color: str = "default") -> List[Dict[str, Any]]:
    return [{
        "type": "text",
        "text": {"content": content},
        "annotations": {
            "bold": bold,
            "italic": italic,
            "strikethrough": False,
            "underline": False,
            "code": code,
            "color": color,
        },
        "plain_text": content,
        "href": None,
    }]


def build_paragraph(content: str, bold: bool = False) -> Dict[str, Any]:
    return {
        "object": "block",
        "type": "paragraph",
        "paragraph": {
            "rich_text": build_rich_text(content, bold=bold)
        }
    }


def build_heading_1(text: str) -> Dict[str, Any]:
    return {
        "object": "block",
        "type": "heading_1",
        "heading_1": {
            "rich_text": build_rich_text(text, bold=True)
        }
    }


def build_heading_2(text: str) -> Dict[str, Any]:
    return {
        "object": "block",
        "type": "heading_2",
        "heading_2": {
            "rich_text": build_rich_text(text, bold=True)
        }
    }


def build_bullet_item(bold_prefix: str, text: str) -> Dict[str, Any]:
    return {
        "object": "block",
        "type": "bulleted_list_item",
        "bulleted_list_item": {
            "rich_text": [
                {
                    "type": "text",
                    "text": {"content": bold_prefix},
                    "annotations": {"bold": True, "italic": False, "strikethrough": False, "underline": False, "code": False, "color": "default"},
                    "plain_text": bold_prefix,
                },
                {
                    "type": "text",
                    "text": {"content": f" {text}"},
                    "annotations": {"bold": False, "italic": False, "strikethrough": False, "underline": False, "code": False, "color": "default"},
                    "plain_text": f" {text}",
                }
            ]
        }
    }


def build_callout(text: str, emoji: str = "🪰") -> Dict[str, Any]:
    return {
        "object": "block",
        "type": "callout",
        "callout": {
            "rich_text": build_rich_text(text),
            "icon": {"type": "emoji", "emoji": emoji}
        }
    }


def build_divider() -> Dict[str, Any]:
    return {
        "object": "block",
        "type": "divider",
        "divider": {}
    }


def format_milestone_notion_payload(
    generation: int,
    total_generations: int,
    gen_stats: Dict[str, Any],
    tournament_stats: Optional[Dict[str, Any]] = None,
    benchmark_comparison: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Constructs a complete Notion page payload conforming to Notion API (API-post-page).
    """
    is_baseline = (generation == 0)
    is_final = (generation >= total_generations - 1)
    
    if is_baseline:
        title = f"[Milestone #0] Fly Brain v3 진화 베이스라인 보고서 (Gen 0)"
    elif is_final:
        title = f"[Final Champion] Fly Brain v3 최종 진화 및 글래디에이터 보고서 (Gen {generation+1}/{total_generations})"
    else:
        title = f"[Milestone] Fly Brain v3 진화 진행 보고서 (Gen {generation+1}/{total_generations})"

    best_fit = gen_stats.get("global_best_fitness", 0.0)
    best_mean = gen_stats.get("global_best_mean", 0.0)
    best_max = gen_stats.get("global_best_max", 0.0)

    children = [
        build_heading_1("🧬 Fly Brain v3: 64-PN 전략 감각 신경진화 리포트"),
        build_callout(
            f"세대 진행: {generation+1}/{total_generations} | 글로벌 최고 적합도: {best_fit:.2f} | 챔피언 평균 점수: {best_mean:.1f}점 (최고 {best_max}점)",
            emoji="🏆" if is_final else "🪰"
        ),
        build_divider(),
        build_heading_2("📊 세대 핵심 성과 지표 (Core Metrics)"),
        build_bullet_item("글로벌 챔피언 평균 점수:", f"{best_mean:.1f} pts (최고 {best_max} pts)"),
        build_bullet_item("전역 최고 적합도 (Fitness):", f"{best_fit:.2f}"),
        build_bullet_item("세대 소요 시간:", f"{gen_stats.get('duration_sec', 0.0):.2f} 초"),
        build_bullet_item("환형 이주(Ring Migration) 수행 여부:", f"{'예 (교잡 완료)' if gen_stats.get('migrated', False) else '아니오'}"),
    ]

    # Island statistics breakdown
    children.append(build_heading_2("🏝️ 4대 전문 생태계 (Quality-Diversity Demes) 현황"))
    island_stats = gen_stats.get("island_stats", [])
    for isl in island_stats:
        name = isl.get("name", "Unknown Island")
        mean = isl.get("mean_score", 0.0)
        u_rate = isl.get("upper_bonus_rate", 0.0) * 100.0
        y_count = isl.get("yacht_count", 0)
        fit = isl.get("best_fitness", 0.0)
        sig = isl.get("sigma", 0.0)
        stag = "⚠️ 정체(Hypermutation)" if isl.get("stagnated", False) else "정상 진화"
        desc = f"적합도: {fit:.1f} | 평균 점수: {mean:.1f}점 | 상단 보너스: {u_rate:.1f}% | 야추: {y_count}회 | 변이 강도 σ: {sig:.3f} ({stag})"
        children.append(build_bullet_item(f"[{name}]", desc))

    # Tournament / Strategic comparison if available
    if tournament_stats:
        children.append(build_heading_2("⚔️ 글래디에이터 토너먼트 벤치마크 결과"))
        children.append(build_bullet_item("총 대국 수:", f"{tournament_stats.get('total_games', 200)} 게임"))
        children.append(build_bullet_item("평균 점수:", f"{tournament_stats.get('mean_score', 0.0):.1f} 점"))
        children.append(build_bullet_item("스트레이트 성공률 (Small + Large):", f"{tournament_stats.get('straight_rate', 0.0)*100.0:.1f}% (목표: >20%)"))
        children.append(build_bullet_item("상단 63점 보너스 획득률:", f"{tournament_stats.get('upper_bonus_rate', 0.0)*100.0:.1f}% (목표: >10%)"))
        children.append(build_bullet_item("야추(Yacht) 성공률:", f"{tournament_stats.get('yacht_rate', 0.0)*100.0:.1f}%"))
        children.append(build_bullet_item("풀하우스 성공률:", f"{tournament_stats.get('full_house_rate', 0.0)*100.0:.1f}%"))

    children.append(build_heading_2("🧠 64-PN 전략 감각 아키텍처 관찰 요약"))
    children.append(build_bullet_item("상단 미시 경제학 (PN 50, 51, 57, 58):", "63점 결핍도 및 2차 보상 셰이핑((UpperSum/63)^2) 적용으로 조기 6 소진 억제"))
    children.append(build_bullet_item("스트레이트 위상 레이더 (PN 52, 53, 56):", "양방향 오픈 스트레이트와 갓샷 간극 분리 인식을 통해 페어 매몰 탈출"))
    children.append(build_bullet_item("희생 에어백 및 PvP 마진 (PN 59, 60, 62):", "Aces/Choice 잔여 상태에 따른 위험 감수 및 대국 격차 추종"))

    payload = {
        "parent": {"page_id": NOTION_PARENT_PAGE_ID},
        "icon": {"type": "emoji", "emoji": "🏆" if is_final else "🪰"},
        "properties": {
            "title": [
                {
                    "type": "text",
                    "text": {"content": title}
                }
            ]
        },
        "children": children,
    }
    return payload


def save_notion_report_payload(payload: Dict[str, Any], gen_idx: int) -> Path:
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    file_path = REPORTS_DIR / f"notion_payload_gen_{gen_idx:03d}.json"
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    return file_path
