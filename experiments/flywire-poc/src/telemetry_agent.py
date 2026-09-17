import copy
from typing import Dict, List, Optional, Tuple, Any
import numpy as np
import scipy.sparse as sp

from forward_sim import FlySubcircuitSNN, load_cached_subcircuit
from agent import FlyBrainAgent
from decoder import decode_hold_mask, decode_category_selection
from encoder import encode_state_to_pn
from synaptic_plasticity import set_kc_mbon_dense, extract_kc_mbon_dense
from yacht_env import YachtEnv, CATEGORIES, ScoreCategory, calculate_score


class TelemetryFlyBrainAgent(FlyBrainAgent):
    """
    Instrumented FlyBrainAgent that captures millisecond-by-millisecond
    spike rasters and synaptic activations across all 1,575 neurons for visualization.
    """
    def __init__(self, snn: FlySubcircuitSNN, sim_steps: int = 15, pulse_steps: int = 4):
        super().__init__(snn=snn, sim_steps=sim_steps, pulse_steps=pulse_steps)
        self.last_telemetry: Optional[Dict[str, Any]] = None

    def _run_brain_instrumented(
        self,
        dice: List[int],
        roll_count: int,
        available_categories: List[ScoreCategory],
        phase: str = "hold",
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        self.snn.reset()
        pn_current = encode_state_to_pn(dice, roll_count, available_categories, num_pn=self.snn.num_pn)
        
        mbon_counts = np.zeros(self.snn.num_mbon, dtype=int)
        spikes_per_step: List[List[int]] = []
        kc_spike_counts = 0
        apl_fired_steps: List[int] = []
        
        apl_idx = self.snn.apl_index if hasattr(self.snn, "apl_index") else None
        
        for t in range(self.sim_steps):
            ext_current = np.zeros(self.snn.num_neurons, dtype=np.float32)
            if t < self.pulse_steps:
                ext_current[self.snn.pn_slice] = pn_current
                
            spikes = self.snn.step(ext_current)
            active_indices = np.where(spikes)[0].tolist()
            spikes_per_step.append(active_indices)
            
            # Track KC spikes
            kc_slice = self.snn.kc_slice
            kc_active = np.sum(spikes[kc_slice])
            kc_spike_counts += int(kc_active)
            
            # Track APL
            if apl_idx is not None and spikes[apl_idx]:
                apl_fired_steps.append(t)
                
            # Track MBON
            mbon_counts += spikes[self.snn.mbon_slice].astype(int)
            
        telemetry = {
            "phase": phase,
            "sim_steps": self.sim_steps,
            "dice": list(dice),
            "roll_count": roll_count,
            "spikes_per_step": spikes_per_step,
            "total_kc_spikes": kc_spike_counts,
            "apl_fired_steps": apl_fired_steps,
            "mbon_firing_counts": mbon_counts.tolist(),
            "pn_currents": pn_current.tolist(),
        }
        return mbon_counts, telemetry

    def decide_hold_with_telemetry(
        self,
        dice: List[int],
        roll_count: int,
        available_categories: List[ScoreCategory],
    ) -> Tuple[List[bool], Dict[str, Any]]:
        mbon_counts, telemetry = self._run_brain_instrumented(dice, roll_count, available_categories, phase="hold")
        holds = decode_hold_mask(mbon_counts, dice=dice)
        telemetry["decision"] = holds
        telemetry["decision_type"] = "hold"
        self.last_telemetry = telemetry
        return holds, telemetry

    def decide_category_with_telemetry(
        self,
        dice: List[int],
        roll_count: int,
        available_categories: List[ScoreCategory],
    ) -> Tuple[ScoreCategory, Dict[str, Any]]:
        mbon_counts, telemetry = self._run_brain_instrumented(dice, roll_count, available_categories, phase="category")
        selected = decode_category_selection(mbon_counts, available_categories, dice=dice)
        telemetry["decision"] = selected
        telemetry["decision_type"] = "category"
        self.last_telemetry = telemetry
        return selected, telemetry


class GameSession:
    """
    Interactive single-game session manager for real-time stepping and visualizer playback.
    """
    def __init__(self, agent: TelemetryFlyBrainAgent):
        self.agent = agent
        self.env = YachtEnv()
        self.history: List[Dict[str, Any]] = []

    def reset(self):
        self.env = YachtEnv()
        self.history = []

    def step(self) -> Dict[str, Any]:
        """
        Executes one atomic micro-step of Yacht:
        - If roll_count < 3 and not all held: asks agent to hold dice, rolls next dice.
        - If roll_count == 3 or all held: asks agent for category, scores, advances to next round.
        """
        if self.env.is_finished:
            return {
                "action": "finished",
                "finished": True,
                "total_score": self.env.total_score,
                "score_board": copy.deepcopy(self.env.score_board),
                "round": 12,
                "roll_count": 3,
                "dice": list(self.env.current_dice),
                "current_dice": list(self.env.current_dice),
                "upper_sum": self.env.upper_section_sum,
                "upper_bonus": self.env.upper_bonus,
                "telemetry": None,
            }
            
        current_dice = list(self.env.current_dice)
        available_cats = self.env.get_available_categories()
        roll_count = self.env.roll_count
        r_num = self.env.round_num
        
        # Check if we should score or roll
        if roll_count >= 3:
            # Must score
            cat, telemetry = self.agent.decide_category_with_telemetry(current_dice, roll_count, available_cats)
            pts = self.env.score(cat)
            
            step_record = {
                "action": "score",
                "round": r_num,
                "dice": current_dice,
                "current_dice": current_dice,
                "category": cat,
                "points": pts,
                "roll_count": 3,
                "total_score": self.env.total_score,
                "score_board": copy.deepcopy(self.env.score_board),
                "upper_sum": self.env.upper_section_sum,
                "upper_bonus": self.env.upper_bonus,
                "finished": self.env.is_finished,
                "telemetry": telemetry,
            }
            self.history.append(step_record)
            return step_record
            
        else:
            # Decide hold
            holds, telemetry = self.agent.decide_hold_with_telemetry(current_dice, roll_count, available_cats)
            
            if all(holds):
                # Agent chooses to hold all -> score immediately!
                cat, cat_telemetry = self.agent.decide_category_with_telemetry(current_dice, roll_count, available_cats)
                pts = self.env.score(cat)
                
                step_record = {
                    "action": "lock_and_score",
                    "round": r_num,
                    "dice": current_dice,
                    "current_dice": current_dice,
                    "holds": holds,
                    "category": cat,
                    "points": pts,
                    "roll_count": roll_count,
                    "total_score": self.env.total_score,
                    "score_board": copy.deepcopy(self.env.score_board),
                    "upper_sum": self.env.upper_section_sum,
                    "upper_bonus": self.env.upper_bonus,
                    "finished": self.env.is_finished,
                    "telemetry": cat_telemetry,
                }
                self.history.append(step_record)
                return step_record
            else:
                # Roll unheld dice
                self.env.roll(holds)
                next_dice = list(self.env.current_dice)
                
                step_record = {
                    "action": "roll",
                    "round": r_num,
                    "prev_dice": current_dice,
                    "holds": holds,
                    "next_dice": next_dice,
                    "current_dice": next_dice,
                    "dice": next_dice,
                    "roll_count": self.env.roll_count,
                    "total_score": self.env.total_score,
                    "score_board": copy.deepcopy(self.env.score_board),
                    "upper_sum": self.env.upper_section_sum,
                    "upper_bonus": self.env.upper_bonus,
                    "finished": self.env.is_finished,
                    "telemetry": telemetry,
                }
                self.history.append(step_record)
                return step_record
