import argparse
import copy
import json
import time
from pathlib import Path
from typing import Dict, List, Tuple
import numpy as np
import scipy.sparse as sp

from forward_sim import FlySubcircuitSNN, load_cached_subcircuit
from agent import FlyBrainAgent, RandomAgent, BaseYachtAgent
from yacht_env import YachtEnv, ScoreCategory, CATEGORIES
from run_game import play_single_game
from synaptic_plasticity import set_kc_mbon_dense, mutate_weights, crossover_weights, extract_kc_mbon_dense
from evolution import ConnectomeEvolution, Individual, evaluate_individual

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


class DenseMLPAgent(BaseYachtAgent):
    """
    Standard artificial 2-layer MLP baseline (Input 50 -> Hidden 128 -> Output 24)
    evaluated with the same sensory input and motor output decoding.
    """
    def __init__(self, w1: np.ndarray, w2: np.ndarray):
        self.w1 = w1  # shape (50, 128)
        self.w2 = w2  # shape (128, 24)
        
    def forward(self, x: np.ndarray) -> np.ndarray:
        h = np.maximum(0.0, x @ self.w1)  # ReLU
        out = h @ self.w2  # Linear logits
        return out

    def decide_hold(self, dice: List[int], roll_count: int, available_categories: List[str]) -> List[bool]:
        from encoder import encode_state_to_pn
        x = encode_state_to_pn(dice, roll_count, available_categories, num_pn=50)
        out = self.forward(x)
        # First 5 logits -> hold decision
        hold_logits = out[:5]
        return [bool(v > 0.0) for v in hold_logits]

    def decide_category(self, dice: List[int], roll_count: int, available_categories: List[str]) -> str:
        from encoder import encode_state_to_pn
        x = encode_state_to_pn(dice, roll_count, available_categories, num_pn=50)
        out = self.forward(x)
        cat_logits = out[5:17]
        # Mask unavailable
        best_cat = available_categories[0]
        best_val = -float("inf")
        for i, cat_name in enumerate(CATEGORIES):
            if cat_name in available_categories:
                if cat_logits[i] > best_val:
                    best_val = cat_logits[i]
                    best_cat = cat_name
        return best_cat


def generate_random_erdos_renyi_snn(base_meta: Dict, density: float = 0.015, seed: int = 42) -> Tuple[sp.csr_matrix, Dict]:
    """Generates an Erdős–Rényi random network with the same neuron count and similar synapse count."""
    np.random.seed(seed)
    n = base_meta["total_neurons"]
    # Random sparse adjacency
    rand_mat = sp.random(n, n, density=density, format="csr", dtype=np.float32, random_state=seed)
    # Zero out diagonal
    rand_mat.setdiag(0.0)
    rand_mat.eliminate_zeros()
    meta = copy.deepcopy(base_meta)
    meta["total_synapses"] = rand_mat.nnz
    return rand_mat, meta


def analyze_agent_phenotype(agent: BaseYachtAgent, num_games: int = 20) -> Dict:
    """
    Detailed behavioral profiling of an agent over multiple games:
    - Held dice frequency per face
    - Category score distributions and zero rates
    - Risk seeking indicators
    """
    face_hold_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0}
    face_appear_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0}
    category_scores = {c: [] for c in CATEGORIES}
    
    total_scores = []
    yacht_attempts_count = 0
    
    for _ in range(num_games):
        env = YachtEnv()
        while not env.is_finished:
            while env.roll_count < 3:
                dice = list(env.current_dice)
                for d in dice:
                    face_appear_counts[d] += 1
                available = env.get_available_categories()
                holds = agent.decide_hold(dice, env.roll_count, available)
                for d, h in zip(dice, holds):
                    if h:
                        face_hold_counts[d] += 1
                        
                if all(holds):
                    break
                env.roll(holds)
                
            available = env.get_available_categories()
            cat = agent.decide_category(list(env.current_dice), env.roll_count, available)
            pts = env.score(cat)
            category_scores[cat].append(pts)
            
        total_scores.append(env.total_score)
        
    hold_ratios = {
        face: (face_hold_counts[face] / max(face_appear_counts[face], 1))
        for face in range(1, 7)
    }
    
    cat_summary = {}
    for c, pts_list in category_scores.items():
        cat_summary[c] = {
            "mean": float(np.mean(pts_list)) if pts_list else 0.0,
            "zeros": sum(1 for p in pts_list if p == 0),
            "count": len(pts_list),
        }
        
    return {
        "mean_score": float(np.mean(total_scores)),
        "max_score": int(np.max(total_scores)),
        "min_score": int(np.min(total_scores)),
        "hold_ratios_by_face": hold_ratios,
        "category_summary": cat_summary,
    }


def save_champion_weights(weights: np.ndarray, metadata: Dict, filepath: Path):
    """Saves optimized KC->MBON weights along with metadata."""
    np.savez_compressed(filepath, kc_mbon_dense=weights, metadata=json.dumps(metadata))
    print(f"✅ Saved champion weights to {filepath} ({filepath.stat().st_size / 1024:.1f} KB)")


def load_champion_agent(filepath: Path) -> FlyBrainAgent:
    """Loads champion weights and instantiates a FlyBrainAgent."""
    data = np.load(filepath)
    dense = data["kc_mbon_dense"]
    base_adj, meta = load_cached_subcircuit()
    adj = set_kc_mbon_dense(base_adj, meta, dense, preserve_topology=True)
    snn = FlySubcircuitSNN(adj, meta)
    return FlyBrainAgent(snn=snn)
