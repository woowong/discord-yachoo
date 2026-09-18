import json
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import numpy as np
import scipy.sparse as sp

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


class FlySubcircuitSNN:
    """
    Vectorized Leaky Integrate-and-Fire (LIF) simulator for Drosophila connectome subgraphs.
    """
    def __init__(
        self,
        weight_matrix: sp.csr_matrix,
        metadata: Dict,
        v_rest: float = 0.0,
        v_threshold: float = 1.0,
        v_reset: float = 0.0,
        tau_decay: float = 0.85,
    ):
        self.W = weight_matrix
        self.metadata = metadata
        self.num_neurons = weight_matrix.shape[0]
        
        # LIF parameters
        self.v_rest = v_rest
        if "thresholds" in metadata:
            self.v_threshold = np.array(metadata["thresholds"], dtype=np.float32)
        else:
            self.v_threshold = v_threshold
        self.v_reset = v_reset
        self.tau_decay = tau_decay
        
        # Layer slicing
        layers = metadata["layers"]
        self.pn_slice = slice(layers["input_pn"]["start"], layers["input_pn"]["start"] + layers["input_pn"]["count"])
        self.kc_slice = slice(layers["kenyon_cells"]["start"], layers["kenyon_cells"]["start"] + layers["kenyon_cells"]["count"])
        self.mbon_slice = slice(layers["mbon"]["start"], layers["mbon"]["start"] + layers["mbon"]["count"])
        
        # APL indexing (single or bilateral)
        apl_meta = layers["apl_inhibition"]
        if "index" in apl_meta:
            self.apl_indices = [apl_meta["index"]]
            self.apl_idx = apl_meta["index"]
        else:
            self.apl_indices = apl_meta.get("indices", [apl_meta.get("left", 0), apl_meta.get("right", 0)])
            self.apl_idx = self.apl_indices[0]
            
        # Optional Central Complex (CX)
        if "central_complex" in layers:
            cx_meta = layers["central_complex"]
            self.cx_slice = slice(cx_meta["start"], cx_meta["start"] + cx_meta["count"])
            self.num_cx = cx_meta["count"]
        else:
            self.cx_slice = None
            self.num_cx = 0

        self.num_pn = layers["input_pn"]["count"]
        self.num_kc = layers["kenyon_cells"]["count"]
        self.num_mbon = layers["mbon"]["count"]
        
        # DAN (Dopaminergic Neuron) neuromodulation gains (PAM / PPL1)
        self.dan_gains: Optional[np.ndarray] = None
        
        # State vectors
        self.V = np.full(self.num_neurons, v_rest, dtype=np.float32)
        self.S = np.zeros(self.num_neurons, dtype=bool)

    def set_dan_modulation(self, dan_gains: Optional[np.ndarray] = None):
        """
        Sets compartment-specific DAN neuromodulatory gains for MBONs.
        Shape: (num_mbon,) float32. None restores default gain of 1.0.
        """
        if dan_gains is None:
            self.dan_gains = None
        else:
            assert len(dan_gains) == self.num_mbon, f"Expected {self.num_mbon} gains, got {len(dan_gains)}"
            self.dan_gains = np.array(dan_gains, dtype=np.float32)

    def reset_state(self):
        """Reset membrane voltages and spike buffers."""
        self.V.fill(self.v_rest)
        self.S.fill(False)

    def reset(self):
        """Alias for reset_state."""
        self.reset_state()

    def step(self, external_current: np.ndarray) -> np.ndarray:
        """
        Execute one discrete simulation time step (dt):
        1. Synaptic current integration: I_syn = W^T * S_{t-1}
        2. DAN compartment modulation on MBON incoming current: I_syn[mbon] *= dan_gains
        3. Membrane leaky integration: V_t = V_{t-1} * tau + I_syn + I_ext
        4. Spike generation: S_t = (V_t >= V_th)
        5. Reset: V_t[S_t] = V_reset
        """
        # Synaptic current from previous spikes (pre -> post)
        # S is pre-synaptic; W.T @ S accumulates incoming post-synaptic current
        if np.any(self.S):
            synaptic_current = self.W.T.dot(self.S.astype(np.float32))
            if self.dan_gains is not None:
                synaptic_current[self.mbon_slice] *= self.dan_gains
        else:
            synaptic_current = 0.0
            
        # Membrane voltage decay and integration
        self.V = self.V * self.tau_decay + synaptic_current + external_current
        
        # Spike threshold detection
        spikes = self.V >= self.v_threshold
        
        # Voltage reset upon spike
        self.V[spikes] = self.v_reset
        self.S = spikes
        
        return spikes


    def run_simulation(
        self,
        num_steps: int = 40,
        active_pn_indices: List[int] | None = None,
        pulse_steps: int = 5,
        pulse_amplitude: float = 1.8
    ) -> Dict:
        """
        Run forward simulation with sensory injection into specified PNs.
        """
        self.reset_state()
        
        if active_pn_indices is None:
            # Default: activate 10 random projection neurons
            active_pn_indices = list(range(0, 10))
            
        history = {
            "pn_spikes": [],
            "kc_spikes": [],
            "mbon_spikes": [],
            "apl_spikes": [],
            "mbon_firing_counts": np.zeros(self.metadata["layers"]["mbon"]["count"], dtype=int)
        }
        
        start_time = time.perf_counter()
        
        for t in range(num_steps):
            ext_current = np.zeros(self.num_neurons, dtype=np.float32)
            
            # Inject sensory pulse during initial steps
            if t < pulse_steps:
                ext_current[active_pn_indices] = pulse_amplitude
                
            spikes = self.step(ext_current)
            
            # Record layer activities
            pn_act = int(np.sum(spikes[self.pn_slice]))
            kc_act = int(np.sum(spikes[self.kc_slice]))
            mbon_acts = spikes[self.mbon_slice]
            mbon_act = int(np.sum(mbon_acts))
            apl_act = int(np.sum(spikes[self.apl_indices]))
            
            history["pn_spikes"].append(pn_act)
            history["kc_spikes"].append(kc_act)
            history["mbon_spikes"].append(mbon_act)
            history["apl_spikes"].append(apl_act)
            if self.cx_slice is not None:
                if "cx_spikes" not in history:
                    history["cx_spikes"] = []
                history["cx_spikes"].append(int(np.sum(spikes[self.cx_slice])))
            history["mbon_firing_counts"] += mbon_acts.astype(int)
            
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        history["elapsed_ms"] = elapsed_ms
        history["steps"] = num_steps
        
        return history


def load_cached_subcircuit(data_dir: Path = DATA_DIR, prefix: str = "mb_subcircuit") -> Tuple[sp.csr_matrix, Dict]:
    adj_file = data_dir / f"{prefix}_adj.npz"
    meta_file = data_dir / f"{prefix}_meta.json"
    
    if not adj_file.exists() or not meta_file.exists():
        raise FileNotFoundError(
            f"Cached subcircuit not found in {data_dir} with prefix '{prefix}'. Run `python src/extract.py` first."
        )
        
    adj = sp.load_npz(adj_file)
    with open(meta_file, "r", encoding="utf-8") as f:
        meta = json.load(f)
        
    return adj, meta


def load_scaled_subcircuit(data_dir: Path = DATA_DIR) -> Tuple[sp.csr_matrix, Dict]:
    return load_cached_subcircuit(data_dir=data_dir, prefix="mb_scaled")


def compute_dan_modulation(
    available_categories: List[str],
    dice: List[int] | None = None,
    num_mbon: int = 24,
    pam_boost: float = 1.3,
    ppl1_inhibit: float = 0.0,
) -> np.ndarray:
    """
    Computes biologically faithful DAN (Dopaminergic Neuron) neuromodulatory gains:
    - PAM cluster (Reward/Approach): Boosts MBONs of high-value available categories (Yacht, LargeStraight, Upper targets).
    - PPL1 cluster (Aversive/Satiety): Suppresses MBONs of consumed/filled categories to 0.0 (satiety inhibition).
    - Behavioral drives: MBON 1 (Straight) is inhibited if straights are unavailable.
    """
    from yacht_env import CATEGORIES, calculate_score
    gains = np.ones(num_mbon, dtype=np.float32)
    avail_set = set(available_categories)
    
    # Support both 24 MBONs (unilateral) and 48 MBONs (bilateral left/right)
    offsets = [0] if num_mbon < 48 else [0, 24]
    
    for offset in offsets:
        # Drive modulation (MBON 0..4)
        has_straight = ("SmallStraight" in avail_set) or ("LargeStraight" in avail_set)
        if not has_straight and offset + 1 < num_mbon:
            gains[offset + 1] = ppl1_inhibit  # Suppress Straight drive when straights consumed
            
        # Category modulation (MBON 5..16)
        for i, cat in enumerate(CATEGORIES):
            mbon_idx = offset + 5 + i
            if mbon_idx >= num_mbon:
                break
            if cat not in avail_set:
                gains[mbon_idx] = ppl1_inhibit  # PPL1 satiety silence
            else:
                if cat in ("Yacht", "LargeStraight"):
                    gains[mbon_idx] = pam_boost
                elif dice is not None:
                    pts = calculate_score(cat, dice)
                    if pts >= 20:
                        gains[mbon_idx] = pam_boost
                        
    return gains


def print_simulation_report(history: Dict, metadata: Dict):

    print("=" * 65)
    print(" 🪰 Drosophila Mushroom Body Forward Propagation Report")
    print("=" * 65)
    print(f"Total steps: {history['steps']} | Sim Duration: {history['elapsed_ms']:.2f} ms")
    print(f"Per-step speed: {history['elapsed_ms'] / history['steps']:.3f} ms/step")
    print("-" * 65)
    print(f"{'Step':<5} | {'PN (Sensory)':<14} | {'Kenyon Cells':<14} | {'MBON (Output)':<14} | {'APL'}")
    print("-" * 65)
    
    for t in range(min(15, history['steps'])):
        pn_bar = "█" * min(history['pn_spikes'][t], 10)
        kc_bar = "█" * min(history['kc_spikes'][t] // 10, 10)
        mbon_bar = "█" * min(history['mbon_spikes'][t], 10)
        apl_indicator = "●" if history['apl_spikes'][t] else "○"
        
        print(f"{t:<5} | {history['pn_spikes'][t]:<2} {pn_bar:<11} | {history['kc_spikes'][t]:<3} {kc_bar:<10} | {history['mbon_spikes'][t]:<2} {mbon_bar:<11} | {apl_indicator}")
        
    print("-" * 65)
    total_pn = sum(history['pn_spikes'])
    total_kc = sum(history['kc_spikes'])
    total_mbon = sum(history['mbon_spikes'])
    
    print(f"Total Spikes Generated:")
    print(f"  - Projection Neurons (Input): {total_pn}")
    print(f"  - Kenyon Cells (Interneurons): {total_kc} (sparse representation)")
    print(f"  - MBON (Decisions/Motors):    {total_mbon}")
    print(f"  - MBON Distribution: {list(history['mbon_firing_counts'])}")
    print("=" * 65)
    
    # Verification check
    if total_mbon > 0:
        print("✅ VERIFICATION PASSED: Input pulse successfully propagated to output MBON neurons!")
    else:
        print("❌ WARNING: No output spikes detected. Adjust synaptic gain or input pulse amplitude.")


def main():
    adj, meta = load_cached_subcircuit()
    print(f"Loaded subcircuit with {meta['total_neurons']} neurons and {meta['total_synapses']} synapses.")
    
    snn = FlySubcircuitSNN(adj, meta)
    
    # Stimulate specific input sensory neurons (e.g. PN #2, #5, #8, #14, #21)
    test_stimulus = [2, 5, 8, 14, 21]
    history = snn.run_simulation(num_steps=30, active_pn_indices=test_stimulus)
    
    print_simulation_report(history, meta)


if __name__ == "__main__":
    main()
