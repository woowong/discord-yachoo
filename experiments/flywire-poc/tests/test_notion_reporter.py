import sys
from pathlib import Path
import pytest

SRC_DIR = Path(__file__).resolve().parent.parent / "src"
sys.path.insert(0, str(SRC_DIR))

from notion_reporter import (
    format_milestone_notion_payload,
    save_notion_report_payload,
    NOTION_PARENT_PAGE_ID,
)


def test_format_milestone_notion_payload():
    sample_stats = {
        "generation": 0,
        "global_best_fitness": 245.5,
        "global_best_mean": 185.0,
        "global_best_max": 250,
        "duration_sec": 4.2,
        "migrated": False,
        "island_stats": [
            {
                "name": "Island 1: Straight Hunter",
                "best_fitness": 240.0,
                "mean_score": 180.0,
                "upper_bonus_rate": 0.15,
                "yacht_count": 2,
                "sigma": 0.06,
                "stagnated": False,
            }
        ]
    }

    payload = format_milestone_notion_payload(0, 100, sample_stats)
    assert payload["parent"]["page_id"] == NOTION_PARENT_PAGE_ID
    assert "Milestone #0" in payload["properties"]["title"][0]["text"]["content"]
    assert len(payload["children"]) >= 5

    saved = save_notion_report_payload(payload, 0)
    assert saved.exists()
