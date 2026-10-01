import sys
from pathlib import Path
import pytest

SRC_DIR = Path(__file__).resolve().parent.parent / "src"
sys.path.insert(0, str(SRC_DIR))

from web_server import ConnectomeVisualizerServer


def test_server_act_hold_decision():
    server = ConnectomeVisualizerServer(use_champion=False)
    dice = [1, 2, 3, 4, 5]
    avail = ["Aces", "Deuces", "Choice", "SmallStraight"]
    
    result = server.act(dice=dice, roll_count=1, available_categories=avail)
    assert "action" in result
    assert result["action"] in ["hold", "score"]
    assert "telemetry" in result
    if result["action"] == "hold":
        assert isinstance(result["holds"], list)
        assert len(result["holds"]) == 5
    else:
        assert result["category"] in avail


def test_server_act_score_decision_at_roll_3():
    server = ConnectomeVisualizerServer(use_champion=False)
    dice = [6, 6, 6, 2, 1]
    avail = ["Sixes", "FourOfAKind", "Choice"]
    
    result = server.act(dice=dice, roll_count=3, available_categories=avail)
    assert result["action"] == "score"
    assert result["category"] in avail
    assert "telemetry" in result
    assert result["telemetry"]["phase"] == "score"


def test_champion_act_with_dopamine_satiety_gating():
    # Load champion server with dopamine gating
    server = ConnectomeVisualizerServer(use_champion=True)
    status = server.get_status()
    assert "Dopamine Island Champion" in status["model_name"]
    
    # Scenario: Two pairs [3, 3, 5, 5, 1], but Full House is ALREADY scored
    dice = [3, 3, 5, 5, 1]
    avail_no_fh = ["Fives", "Threes", "Aces", "Choice"]
    
    result = server.act(dice=dice, roll_count=1, available_categories=avail_no_fh)
    assert "action" in result
    if result["action"] == "hold":
        holds = result["holds"]
        # Must not hold all 4 pair dice when Full House is already consumed!
        assert holds != [True, True, True, True, False]
        # Should only hold the dominant pair (5s)
        assert holds == [False, False, True, True, False]


def test_duel_http_endpoint():
    import threading
    import urllib.request
    import json
    from http.server import ThreadingHTTPServer
    from web_server import VisualizerHTTPHandler

    server = ThreadingHTTPServer(("127.0.0.1", 0), VisualizerHTTPHandler)
    port = server.server_address[1]
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()

    try:
        req = urllib.request.Request(f"http://127.0.0.1:{port}/api/fly/personas")
        with urllib.request.urlopen(req) as resp:
            assert resp.status == 200
            personas = json.loads(resp.read().decode())
            assert "Jackpot" in personas
            assert "Newton" in personas

        data = json.dumps({"persona_a": "Jackpot", "persona_b": "Speeder"}).encode()
        req = urllib.request.Request(f"http://127.0.0.1:{port}/api/fly/duel", data=data, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req) as resp:
            assert resp.status == 200
            res = json.loads(resp.read().decode())
            assert res["winner"] in ("A", "B", "DRAW")
            assert len(res["rounds"]) == 12
            assert "dopamine" in res["rounds"][0]["a"]
    finally:
        server.shutdown()


