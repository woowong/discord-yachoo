from typing import Dict, List, Optional, Tuple
import numpy as np
import scipy.sparse as sp

from forward_sim import FlySubcircuitSNN
from agent import FlyBrainAgent
from decoder import decode_hold_mask, decode_category_selection
from encoder import encode_state_to_pn
from yacht_env import ScoreCategory


class AdvancedCognitionSNN(FlySubcircuitSNN):
    """
    Enhanced SNN simulator with:
    1. Dynamic APL Gating (Attention Mechanism)
       - Strict inhibition (weight = -0.6) during initial sensory exploration
       - Relaxed inhibition (weight = -0.15) during combinatorial reasoning (rolls 2 & 3)
    2. Recurrent Working Memory Persistence
    """
    def set_apl_inhibition_strength(self, weight: float = -0.6):
        """Dynamically adjusts APL feedback inhibition strength to KCs."""
        # Convert to LIL or update CSR data directly
        # In our subcircuit, APL is at apl_idx and connects to all KCs
        # W has pre-synaptic rows and post-synaptic cols
        # Pre-synaptic is APL (row apl_idx), post-synaptic are KCs
        row_start = self.W.indptr[self.apl_idx]
        row_end = self.W.indptr[self.apl_idx + 1]
        self.W.data[row_start:row_end] = weight


class AdvancedCognitiveFlyAgent(FlyBrainAgent):
    """
    Fly agent equipped with:
    - Dynamic APL Attention Gating
    - Turn-level Working Memory (remembers intended drive across rerolls)
    """
    def __init__(
        self,
        snn: Optional[AdvancedCognitionSNN] = None,
        sim_steps: int = 15,
        pulse_steps: int = 4,
        strict_apl: float = -0.6,
        relaxed_apl: float = -0.15,
    ):
        super().__init__(snn=snn, sim_steps=sim_steps, pulse_steps=pulse_steps)
        self.strict_apl = strict_apl
        self.relaxed_apl = relaxed_apl
        self.working_memory_drive: Optional[int] = None
        self.working_memory_target_face: Optional[int] = None

    def reset_turn_memory(self):
        """Resets working memory at the start of a new round."""
        self.working_memory_drive = None
        self.working_memory_target_face = None

    def decide_hold(self, dice: List[int], roll_count: int, available_categories: List[ScoreCategory]) -> List[bool]:
        # 1. Dynamic APL Gating:
        # Roll 1 = strict sparsity filter (-0.6); Roll 2/3 = relaxed bandwidth (-0.15)
        if isinstance(self.snn, AdvancedCognitionSNN):
            apl_weight = self.strict_apl if roll_count == 1 else self.relaxed_apl
            self.snn.set_apl_inhibition_strength(apl_weight)
            
        # 2. Run brain forward pass
        mbon_counts = self._run_brain(dice, roll_count, available_categories)
        
        # 3. Incorporate Working Memory:
        # If we already committed to a drive in roll 1, boost that drive in MBON 0..4
        if self.working_memory_drive is not None and roll_count > 1:
            mbon_counts[self.working_memory_drive] += 2.0
            
        holds = decode_hold_mask(mbon_counts, dice=dice, available_categories=available_categories)

        
        # Record intended drive into working memory
        best_drive = int(np.argmax(mbon_counts[:5]))
        self.working_memory_drive = best_drive
        
        return holds

    def decide_category(self, dice: List[int], roll_count: int, available_categories: List[ScoreCategory]) -> ScoreCategory:
        if isinstance(self.snn, AdvancedCognitionSNN):
            self.snn.set_apl_inhibition_strength(self.relaxed_apl)
            
        mbon_counts = self._run_brain(dice, roll_count, available_categories)
        selected = decode_category_selection(mbon_counts, available_categories, dice=dice)
        self.reset_turn_memory()
        return selected
