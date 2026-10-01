import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

SRC_DIR = Path(__file__).resolve().parent.parent / "src"
sys.path.insert(0, str(SRC_DIR))

from colosseum_broadcaster import format_ascii_board, format_dice_with_locks, render_dopamine_gauge, run_full_broadcast


def test_ascii_board_formatting():
    sb_a = {"Aces": 3, "Sixes": 18, "Choice": 22}
    sb_b = {"Deuces": 6, "FullHouse": 25}
    board = format_ascii_board("Jackp", "Newto", sb_a, sb_b, 43, 31, 0, 0)
    assert "Category   | Jackp | Newto" in board
    assert "Aces" in board
    assert "Sixes" in board
    assert "Choice" in board
    assert "Total" in board
    assert "43" in board
    assert "31" in board


def test_dice_with_locks():
    dice = [5, 5, 5, 2, 1]
    holds = [True, True, True, False, False]
    formatted = format_dice_with_locks(dice, holds)
    assert ":five:" in formatted
    assert "🔒 🔒 🔒 ▫️ ▫️" in formatted


def test_dopamine_gauge():
    gauge = render_dopamine_gauge(150.0)
    assert "150%" in gauge
    assert "█" in gauge


@patch("colosseum_broadcaster.time.sleep")
@patch("colosseum_broadcaster.patch_discord_message")
@patch("colosseum_broadcaster.call_worker_settle")
def test_full_broadcast_mocked(mock_settle, mock_patch, mock_sleep):
    mock_patch.return_value = True
    mock_settle.return_value = True

    run_full_broadcast(
        match_id="test_match_123",
        channel_id="c1",
        message_id="m1",
        persona_a_id="Jackpot",
        persona_b_id="Newton",
        discord_token="fake-token",
        worker_settle_url="http://worker/settle",
        fly_brain_url="http://fly"
    )

    # Verify multiple Discord messages were sent (opening + 12 rounds * multiple rolls)
    assert mock_patch.call_count >= 25
    # Verify Worker settle was called once at the end
    mock_settle.assert_called_once()
    args, kwargs = mock_settle.call_args
    assert args[0] == "http://worker/settle"
    assert args[1]["match_id"] == "test_match_123"
    assert "winner" in args[1]
