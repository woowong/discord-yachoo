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
    def __init__(self, use_champion: bool = True):
        self.base_adj, self.metadata = load_cached_subcircuit()
        self.use_champion = use_champion
        
        # Load super champion weights if available
        champ_path = SRC_DIR.parent / "data" / "super_champion_fly.npz"
        if use_champion and champ_path.exists():
            data = np.load(champ_path)
            weights = data["kc_mbon_weights"]
            adj = set_kc_mbon_dense(self.base_adj, self.metadata, weights, preserve_topology=True)
            self.snn = FlySubcircuitSNN(adj, self.metadata)
            self.model_name = f"Super Champion Fly SNN (Gen {data.get('generations', 150)})"
        else:
            self.snn = FlySubcircuitSNN(self.base_adj, self.metadata)
            self.model_name = "Baseline Connectome SNN"
            
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

        self.send_error(HTTPStatus.NOT_FOUND, "Endpoint not found")


def run_server(host: str = "0.0.0.0", port: int = 8765):
    global SERVER_INSTANCE
    STATIC_DIR.mkdir(parents=True, exist_ok=True)
    SERVER_INSTANCE = ConnectomeVisualizerServer(use_champion=True)
    
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


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host IP to bind")
    parser.add_argument("--port", type=int, default=8765, help="Port to bind")
    args = parser.parse_args()
    
    run_server(host=args.host, port=args.port)
