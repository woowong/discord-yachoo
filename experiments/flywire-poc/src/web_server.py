import argparse
import json
import mimetypes
import os
import queue
import sys
import threading
import time
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Dict, List, Optional, Any

SRC_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SRC_DIR))

from forward_sim import FlySubcircuitSNN, load_cached_subcircuit
from synaptic_plasticity import set_kc_mbon_dense
from telemetry_agent import TelemetryFlyBrainAgent, GameSession
from personas import PERSONA_SPECS, simulate_colosseum_duel
import numpy as np

STATIC_DIR = SRC_DIR.parent / "web"

# Global SSE Subscriber queues
SSE_CLIENTS: List[queue.Queue] = []
SSE_LOCK = threading.Lock()


def broadcast_sse(event_type: str, data: Any):
    payload = f"event: {event_type}\ndata: {json.dumps(data)}\n\n".encode("utf-8")
    with SSE_LOCK:
        dead_clients = []
        for q in SSE_CLIENTS:
            try:
                q.put_nowait(payload)
            except Exception:
                dead_clients.append(q)
        for dead in dead_clients:
            if dead in SSE_CLIENTS:
                SSE_CLIENTS.remove(dead)


class ConnectomeVisualizerServer:
    def __init__(self, use_champion: bool = True, use_scaled: bool = False):
        self.use_scaled = use_scaled
        if use_scaled:
            from forward_sim import load_scaled_subcircuit
            self.base_adj, self.metadata = load_scaled_subcircuit()
            champ_path = SRC_DIR.parent / "data" / "champion_fly_3d_weights.npz"
        else:
            self.base_adj, self.metadata = load_cached_subcircuit()
            v3_champ = SRC_DIR.parent / "data" / "champion_fly_v3_weights.npz"
            dopamine_champ = SRC_DIR.parent / "data" / "champion_fly_weights.npz"
            champ_path = v3_champ if v3_champ.exists() else (dopamine_champ if dopamine_champ.exists() else (SRC_DIR.parent / "data" / "super_champion_fly.npz"))
            
        self.use_champion = use_champion
        if use_champion and champ_path.exists():
            data = np.load(champ_path)
            weights = data["weights"] if "weights" in data else data["kc_mbon_weights"]
            adj = set_kc_mbon_dense(self.base_adj, self.metadata, weights, preserve_topology=True)
            self.snn = FlySubcircuitSNN(adj, self.metadata)
            scale_label = "3D Scaled " if use_scaled else ""
            self.model_name = f"{scale_label}Dopamine Island Champion Fly Brain v3 (64-PN)"
        else:
            self.snn = FlySubcircuitSNN(self.base_adj, self.metadata)
            self.model_name = "3D Scaled Connectome SNN" if use_scaled else "Baseline Connectome SNN"

            
        self.agent = TelemetryFlyBrainAgent(self.snn, sim_steps=15, pulse_steps=4)
        self.session = GameSession(self.agent)

    def get_status(self) -> Dict[str, Any]:
        return {
            "model_name": self.model_name,
            "total_neurons": self.snn.num_neurons,
            "num_pn": self.snn.num_pn,
            "num_kc": self.snn.num_kc,
            "num_mbon": self.snn.num_mbon,
            "round": self.session.env.round_num,
            "roll_count": self.session.env.roll_count,
            "current_dice": list(self.session.env.current_dice),
            "score_board": self.session.env.score_board,
            "total_score": self.session.env.total_score,
            "upper_sum": self.session.env.upper_section_sum,
            "upper_bonus": self.session.env.upper_bonus,
            "is_finished": self.session.env.is_finished,
            "is_scaled": self.use_scaled or (self.snn.num_neurons > 5000),
        }

    def get_topology(self) -> Dict[str, Any]:
        return {
            "total_neurons": self.snn.num_neurons,
            "coordinates_3d": self.metadata.get("coordinates_3d", []),
            "regions": self.metadata.get("regions", []),
            "layers": self.metadata.get("layers", {}),
            "is_scaled": self.use_scaled or (self.snn.num_neurons > 5000),
        }

    def step(self) -> Dict[str, Any]:
        record = self.session.step()
        broadcast_sse("step", record)
        return record

    def reset(self) -> Dict[str, Any]:
        self.session.reset()
        status = self.get_status()
        broadcast_sse("reset", status)
        return status

    def act(self, dice: List[int], roll_count: int, available_categories: List[str]) -> Dict[str, Any]:
        if not available_categories:
            from yacht_env import CATEGORIES
            available_categories = list(CATEGORIES)

        if roll_count < 3:
            holds, telemetry = self.agent.decide_hold_with_telemetry(dice, roll_count, available_categories)
            if all(holds):
                cat, cat_telemetry = self.agent.decide_category_with_telemetry(dice, roll_count, available_categories)
                broadcast_sse("step", cat_telemetry)
                return {
                    "action": "score",
                    "category": cat,
                    "holds": holds,
                    "telemetry": {
                        "phase": "score",
                        "total_kc_spikes": cat_telemetry.get("total_kc_spikes", 0),
                        "mbon_firing": cat_telemetry.get("mbon_firing_counts", [])
                    }
                }
            else:
                broadcast_sse("step", telemetry)
                return {
                    "action": "hold",
                    "holds": holds,
                    "telemetry": {
                        "phase": "hold",
                        "total_kc_spikes": telemetry.get("total_kc_spikes", 0),
                        "mbon_firing": telemetry.get("mbon_firing_counts", [])
                    }
                }
        else:
            cat, cat_telemetry = self.agent.decide_category_with_telemetry(dice, roll_count, available_categories)
            broadcast_sse("step", cat_telemetry)
            return {
                "action": "score",
                "category": cat,
                "holds": [True, True, True, True, True],
                "telemetry": {
                    "phase": "score",
                    "total_kc_spikes": cat_telemetry.get("total_kc_spikes", 0),
                    "mbon_firing": cat_telemetry.get("mbon_firing_counts", [])
                }
            }


SERVER_INSTANCE: Optional[ConnectomeVisualizerServer] = None


class VisualizerHTTPHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(STATIC_DIR), **kwargs)

    def end_headers(self):
        # Enable CORS and disable caching for live updates
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.OK)
        self.end_headers()

    def do_GET(self):
        if self.path == "/api/status":
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            status = SERVER_INSTANCE.get_status() if SERVER_INSTANCE else {}
            self.wfile.write(json.dumps(status).encode("utf-8"))
            return

        elif self.path == "/api/topology":
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            topo = SERVER_INSTANCE.get_topology() if SERVER_INSTANCE else {}
            self.wfile.write(json.dumps(topo).encode("utf-8"))
            return

        elif self.path == "/api/fly/personas":
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(PERSONA_SPECS).encode("utf-8"))
            return

        elif self.path == "/events":
            # Server-Sent Events stream
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Connection", "keep-alive")
            self.end_headers()

            client_queue = queue.Queue(maxsize=100)
            with SSE_LOCK:
                SSE_CLIENTS.append(client_queue)

            try:
                # Send initial hello
                initial_msg = f"event: connect\ndata: {json.dumps(SERVER_INSTANCE.get_status())}\n\n".encode("utf-8")
                self.wfile.write(initial_msg)
                self.wfile.flush()

                while True:
                    try:
                        msg = client_queue.get(timeout=20.0)
                        self.wfile.write(msg)
                        self.wfile.flush()
                    except queue.Empty:
                        # Keep-alive heartbeat ping
                        self.wfile.write(b": ping\n\n")
                        self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError):
                pass
            finally:
                with SSE_LOCK:
                    if client_queue in SSE_CLIENTS:
                        SSE_CLIENTS.remove(client_queue)
            return

        # Serve static files from STATIC_DIR
        return super().do_GET()

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length > 0 else b""
        data = json.loads(body.decode("utf-8")) if body else {}

        if self.path == "/api/step":
            record = SERVER_INSTANCE.step() if SERVER_INSTANCE else {}
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(record).encode("utf-8"))
            return

        elif self.path == "/api/reset":
            status = SERVER_INSTANCE.reset() if SERVER_INSTANCE else {}
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(status).encode("utf-8"))
            return

        elif self.path == "/api/broadcast_turn":
            # For Discord spectator relay
            broadcast_sse("discord_turn", data)
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"broadcast": "ok"}).encode("utf-8"))
            return

        elif self.path == "/api/fly/act":
            dice = data.get("dice", [1, 1, 1, 1, 1])
            roll_count = data.get("roll_count", 1)
            available_categories = data.get("available_categories", [])
            result = SERVER_INSTANCE.act(dice, roll_count, available_categories) if SERVER_INSTANCE else {}
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode("utf-8"))
            return

        elif self.path == "/api/fly/duel":
            persona_a = data.get("persona_a", "Jackpot")
            persona_b = data.get("persona_b", "Newton")
            try:
                duel_result = simulate_colosseum_duel(persona_a, persona_b)
                self.send_response(HTTPStatus.OK)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(duel_result).encode("utf-8"))
            except Exception as e:
                self.send_response(HTTPStatus.BAD_REQUEST)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
            return

        self.send_error(HTTPStatus.NOT_FOUND, "Endpoint not found")


def run_server(host: str = "0.0.0.0", port: int = 8765, use_scaled: bool = False):
    global SERVER_INSTANCE
    STATIC_DIR.mkdir(parents=True, exist_ok=True)
    SERVER_INSTANCE = ConnectomeVisualizerServer(use_champion=True, use_scaled=use_scaled)
    
    server_address = (host, port)
    httpd = ThreadingHTTPServer(server_address, VisualizerHTTPHandler)
    
    print("=" * 70)
    print(" 🧠 Drosophila Connectome SNN: Real-Time Web Visualizer Server ")
    print(f" Local Access    : http://localhost:{port}")
    print(f" Tailscale Access: http://100.85.188.7:{port}")
    print(f" Network Binding : http://{host}:{port}")
    print(f" Loaded Model    : {SERVER_INSTANCE.model_name}")
    print("=" * 70)
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.shutdown()


def main():
    parser = argparse.ArgumentParser(description="FlyWire Connectome SNN Web Visualizer Server")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host address to bind")
    parser.add_argument("--port", type=int, default=8765, help="Port to listen on")
    parser.add_argument("--scale-3d", action="store_true", help="Use scaled 3D bilateral connectome (~30k neurons)")
    args = parser.parse_args()
    
    run_server(host=args.host, port=args.port, use_scaled=args.scale_3d)


if __name__ == "__main__":
    main()
