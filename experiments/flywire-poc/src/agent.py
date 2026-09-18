import random
from typing import List, Optional
import numpy as np

from encoder import encode_state_to_pn
from decoder import decode_hold_mask, decode_category_selection
from forward_sim import FlySubcircuitSNN, load_cached_subcircuit, compute_dan_modulation
from yacht_env import ScoreCategory


class BaseYachtAgent:
    def decide_hold(self, dice: List[int], roll_count: int, available_categories: List[ScoreCategory]) -> List[bool]:
        raise NotImplementedError

    def decide_category(self, dice: List[int], roll_count: int, available_categories: List[ScoreCategory]) -> ScoreCategory:
        raise NotImplementedError


class RandomAgent(BaseYachtAgent):
    """A baseline agent that picks completely random actions."""
    def decide_hold(self, dice: List[int], roll_count: int, available_categories: List[ScoreCategory]) -> List[bool]:
        return [bool(random.getrandbits(1)) for _ in range(5)]

    def decide_category(self, dice: List[int], roll_count: int, available_categories: List[ScoreCategory]) -> ScoreCategory:
        return random.choice(available_categories)


class FlyBrainAgent(BaseYachtAgent):
    """
    An agent driven by the Drosophila Mushroom Body Spiking Neural Network.
    Translates Yacht game state into sensory inputs, simulates forward spike propagation,
    and decodes motor decisions from MBON firing patterns.
    """
    def __init__(
        self,
        snn: Optional[FlySubcircuitSNN] = None,
        sim_steps: int = 15,
        pulse_steps: int = 4,
        enable_dan_modulation: bool = True,
    ):
        if snn is None:
            adj, meta = load_cached_subcircuit()
            snn = FlySubcircuitSNN(adj, meta)
        self.snn = snn
        self.sim_steps = sim_steps
        self.pulse_steps = pulse_steps
        self.enable_dan_modulation = enable_dan_modulation

    def _run_brain(self, dice: List[int], roll_count: int, available_categories: List[ScoreCategory]) -> np.ndarray:
        # 1. Apply DAN neuromodulation (PAM reward amplification / PPL1 satiety inhibition)
        if hasattr(self.snn, "set_dan_modulation"):
            if self.enable_dan_modulation:
                dan_gains = compute_dan_modulation(
                    available_categories,
                    dice=dice,
                    num_mbon=self.snn.metadata["layers"]["mbon"]["count"],
                )
                self.snn.set_dan_modulation(dan_gains)
            else:
                self.snn.set_dan_modulation(None)

        # 2. Encode state into input current for PNs
        pn_current = encode_state_to_pn(dice, roll_count, available_categories, num_pn=self.snn.metadata["layers"]["input_pn"]["count"])
        
        self.snn.reset_state()
        mbon_counts = np.zeros(self.snn.metadata["layers"]["mbon"]["count"], dtype=int)
        
        for t in range(self.sim_steps):
            ext_current = np.zeros(self.snn.num_neurons, dtype=np.float32)
            if t < self.pulse_steps:
                # Inject into PNs
                ext_current[self.snn.pn_slice] = pn_current
                
            spikes = self.snn.step(ext_current)
            mbon_counts += spikes[self.snn.mbon_slice].astype(int)
            
        return mbon_counts


    def decide_hold(self, dice: List[int], roll_count: int, available_categories: List[ScoreCategory]) -> List[bool]:
        mbon_counts = self._run_brain(dice, roll_count, available_categories)
        return decode_hold_mask(mbon_counts, dice=dice, available_categories=available_categories)


    def decide_category(self, dice: List[int], roll_count: int, available_categories: List[ScoreCategory]) -> ScoreCategory:
        mbon_counts = self._run_brain(dice, roll_count, available_categories)
        return decode_category_selection(mbon_counts, available_categories, dice=dice)

