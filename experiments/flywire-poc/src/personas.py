import copy
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from collections import Counter
import numpy as np

from forward_sim import FlySubcircuitSNN, load_cached_subcircuit
from synaptic_plasticity import set_kc_mbon_dense
from agent import BaseYachtAgent
from yacht_env import YachtEnv, CATEGORIES, ScoreCategory, calculate_score
from decoder import decode_hold_mask, decode_category_selection
from encoder import encode_state_to_pn

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

PERSONA_SPECS: Dict[str, Dict[str, Any]] = {
    "Jackpot": {
        "id": "Jackpot",
        "name": "Jackpot",
        "title": "폭주 초파리 잭팟",
        "emoji": "🔥",
        "elo": 1250,
        "style": "올인 도파민 중독형",
        "pam_boost": 2.2,
        "ppl1_inhibit": 0.0,
        "yacht_bias": 2.5,
        "straight_bias": 0.6,
        "upper_bias": 0.7,
        "noise_level": 0.02,
    },
    "Newton": {
        "id": "Newton",
        "name": "Newton",
        "title": "상식 초파리 뉴턴",
        "emoji": "🧠",
        "elo": 1200,
        "style": "냉철한 상단 보너스 계산형",
        "pam_boost": 1.1,
        "ppl1_inhibit": 0.0,
        "yacht_bias": 0.8,
        "straight_bias": 0.9,
        "upper_bias": 1.8,
        "noise_level": 0.0,
    },
    "Speeder": {
        "id": "Speeder",
        "name": "Speeder",
        "title": "질주 초파리 스피더",
        "emoji": "⚡",
        "elo": 1220,
        "style": "직진 스트레이트 포식자",
        "pam_boost": 1.5,
        "ppl1_inhibit": 0.0,
        "yacht_bias": 0.7,
        "straight_bias": 2.4,
        "upper_bias": 0.8,
        "noise_level": 0.01,
    },
    "Chimera": {
        "id": "Chimera",
        "name": "Chimera",
        "title": "혼돈의 돌연변이 키메라",
        "emoji": "🌀",
        "elo": 1280,
        "style": "시냅스 노이즈 변칙 플레이",
        "pam_boost": 1.4,
        "ppl1_inhibit": 0.1,
        "yacht_bias": 1.2,
        "straight_bias": 1.2,
        "upper_bias": 1.0,
        "noise_level": 0.10,
    },
}


class PersonaFlyAgent(BaseYachtAgent):
    def __init__(
        self,
        spec: Dict[str, Any],
        snn: FlySubcircuitSNN,
        sim_steps: int = 15,
        pulse_steps: int = 4,
    ):
        self.spec = spec
        self.id = spec["id"]
        self.name = spec["name"]
        self.title = spec["title"]
        self.emoji = spec["emoji"]
        self.elo = spec["elo"]
        self.snn = snn
        self.sim_steps = sim_steps
        self.pulse_steps = pulse_steps

        self.pam_boost = spec.get("pam_boost", 1.3)
        self.ppl1_inhibit = spec.get("ppl1_inhibit", 0.0)
        self.yacht_bias = spec.get("yacht_bias", 1.0)
        self.straight_bias = spec.get("straight_bias", 1.0)
        self.upper_bias = spec.get("upper_bias", 1.0)
        self.noise_level = spec.get("noise_level", 0.0)

        self.last_dopamine_level: float = 100.0
        self.last_dialogue: str = ""

    def _compute_custom_dan(self, available_categories: List[ScoreCategory], dice: List[int]) -> Tuple[np.ndarray, float]:
        avail_set = set(available_categories)
        c = Counter(dice) if dice else Counter()
        max_c = max(c.values()) if c else 0
        unique = set(dice) if dice else set()

        gains = np.ones(self.snn.num_mbon, dtype=np.float32)
        dopamine_score = 100.0

        # MBON 0: Multiples
        has_multi = ("FullHouse" in avail_set) or ("FourOfAKind" in avail_set) or ("Yacht" in avail_set)
        if has_multi and max_c >= 2:
            multiplier = self.pam_boost * (1.1 + 0.25 * max_c * self.yacht_bias)
            gains[0] = multiplier
            if max_c >= 4 and "Yacht" in avail_set:
                dopamine_score += 80.0 * self.yacht_bias
            elif max_c >= 3:
                dopamine_score += 35.0

        # MBON 1: Straight
        has_straight = ("SmallStraight" in avail_set) or ("LargeStraight" in avail_set)
        if not has_straight:
            gains[1] = self.ppl1_inhibit
        elif has_straight:
            has_pot = (
                {1, 2, 3, 4}.issubset(unique) or {2, 3, 4, 5}.issubset(unique) or {3, 4, 5, 6}.issubset(unique) or
                {1, 2, 4, 5}.issubset(unique) or {2, 3, 5, 6}.issubset(unique) or {1, 3, 4, 5}.issubset(unique)
            )
            if has_pot:
                gains[1] = self.pam_boost * 1.6 * self.straight_bias
                dopamine_score += 50.0 * self.straight_bias

        # MBON 2: Upper high value
        if any(d in (5, 6) for d in dice) and (("Fives" in avail_set) or ("Sixes" in avail_set)):
            gains[2] = self.pam_boost * 1.3 * self.upper_bias
            dopamine_score += 20.0 * self.upper_bias

        # Category modulations
        for i, cat in enumerate(CATEGORIES):
            m_idx = 5 + i
            if m_idx >= self.snn.num_mbon:
                break
            if cat not in avail_set:
                gains[m_idx] = self.ppl1_inhibit
            else:
                if cat == "Yacht":
                    gains[m_idx] = self.pam_boost * self.yacht_bias
                elif cat in ("LargeStraight", "SmallStraight"):
                    gains[m_idx] = self.pam_boost * self.straight_bias
                elif cat in ("Aces", "Twos", "Threes", "Fours", "Fives", "Sixes"):
                    gains[m_idx] = self.pam_boost * self.upper_bias

        # Satiety / Frustration penalty (PPL1)
        if len(avail_set) <= 4:
            dopamine_score -= 15.0

        self.last_dopamine_level = float(np.clip(dopamine_score, 10.0, 250.0))
        return gains, self.last_dopamine_level

    def _generate_dialogue(self, action_type: str, context: Dict[str, Any]) -> str:
        dopamine = self.last_dopamine_level
        if self.name == "Jackpot":
            if dopamine >= 170:
                return f"🔥 \"끼에에엑!! 설탕 냄새 폭발!! 야추 각 떴다 붕붕붕!! (도파민 {dopamine:.0f}%)\""
            elif dopamine <= 65:
                return f"💀 \"찌익... 망했어... 하지만 다음 판에 올인하면 그만이야! (도파민 {dopamine:.0f}%)\""
            else:
                return f"🎲 \"한 번 더 굴려! 인생은 한 방이다 붕! (도파민 {dopamine:.0f}%)\""
        elif self.name == "Newton":
            if dopamine >= 130:
                return f"🧊 \"상단 보너스 달성 확률 87.4% 계산 완료. 계획대로 진행합니다. (도파민 {dopamine:.0f}%)\""
            elif dopamine <= 70:
                return f"📊 \"변동성이 높군요. 서브옵티멀 카테고리로 손실을 최소화합니다. (도파민 {dopamine:.0f}%)\""
            else:
                return f"🧠 \"기댓값 18.5점 확보. 침착하게 다음 롤을 준비합니다. (도파민 {dopamine:.0f}%)\""
        elif self.name == "Speeder":
            if dopamine >= 150:
                return f"⚡ \"일직선으로 달린다!! 스트레이트 냄새가 코를 찌른다 붕!! (도파민 {dopamine:.0f}%)\""
            elif dopamine <= 60:
                return f"🛑 \"왜 중간 숫자가 비는 거야?! 세상이 날 억까한다... (도파민 {dopamine:.0f}%)\""
            else:
                return f"💨 \"직진 아니면 후진뿐이다. 가속 페달 밟는다 붕! (도파민 {dopamine:.0f}%)\""
        elif self.name == "Chimera":
            if dopamine >= 180:
                return f"🌀 \"우주와 교신 중... 주사위 눈이 무지개색으로 보여! (도파민 {dopamine:.0f}%)\""
            elif dopamine <= 50:
                return f"👾 \"회로에 잡음이 심해... 붕? 붕붕? 삐이익! (도파민 {dopamine:.0f}%)\""
            else:
                return f"🔮 \"이 선택의 의미는 나도 모른다 붕. 운명에 맡겨라! (도파민 {dopamine:.0f}%)\""
        return f"🪰 \"붕붕~ (도파민 {dopamine:.0f}%)\""

    def _run_brain(self, dice: List[int], roll_count: int, available_categories: List[ScoreCategory]) -> np.ndarray:
        dan_gains, _ = self._compute_custom_dan(available_categories, dice)
        self.snn.set_dan_modulation(dan_gains)

        pn_current = encode_state_to_pn(dice, roll_count, available_categories, num_pn=self.snn.num_pn)
        self.snn.reset_state()
        mbon_counts = np.zeros(self.snn.num_mbon, dtype=np.float32)

        for t in range(self.sim_steps):
            ext_current = np.zeros(self.snn.num_neurons, dtype=np.float32)
            if t < self.pulse_steps:
                ext_current[self.snn.pn_slice] = pn_current
            if self.noise_level > 0:
                ext_current += np.random.normal(0, self.noise_level, size=self.snn.num_neurons).astype(np.float32)

            self.snn.step(ext_current)
            mbon_counts += self.snn.last_mbon_current

        return mbon_counts

    def decide_hold(self, dice: List[int], roll_count: int, available_categories: List[ScoreCategory]) -> List[bool]:
        mbon_counts = self._run_brain(dice, roll_count, available_categories)
        holds = decode_hold_mask(mbon_counts, dice=dice, available_categories=available_categories)
        self.last_dialogue = self._generate_dialogue("hold", {"holds": holds, "dice": dice})
        return holds

    def decide_category(self, dice: List[int], roll_count: int, available_categories: List[ScoreCategory]) -> ScoreCategory:
        mbon_counts = self._run_brain(dice, roll_count, available_categories)
        cat = decode_category_selection(mbon_counts, available_categories, dice=dice)
        self.last_dialogue = self._generate_dialogue("score", {"cat": cat, "dice": dice})
        return cat


_CACHED_CIRCUIT = None

def get_shared_subcircuit():
    global _CACHED_CIRCUIT
    if _CACHED_CIRCUIT is None:
        base_adj, base_meta = load_cached_subcircuit()
        v3_champ_path = DATA_DIR / "champion_fly_v3_weights.npz"
        if v3_champ_path.exists():
            v3_data = np.load(v3_champ_path)
            weights = v3_data["weights"] if "weights" in v3_data else v3_data["kc_mbon_weights"]
            adj = set_kc_mbon_dense(base_adj, base_meta, weights, preserve_topology=True)
        else:
            adj = base_adj
        _CACHED_CIRCUIT = (adj, base_meta)
    return _CACHED_CIRCUIT


def create_persona_agent(persona_id: str) -> PersonaFlyAgent:
    if persona_id not in PERSONA_SPECS:
        raise ValueError(f"Unknown persona: {persona_id}. Available: {list(PERSONA_SPECS.keys())}")
    adj, meta = get_shared_subcircuit()
    snn = FlySubcircuitSNN(adj.copy(), meta)
    return PersonaFlyAgent(PERSONA_SPECS[persona_id], snn)


def simulate_colosseum_duel(persona_a_id: str, persona_b_id: str) -> Dict[str, Any]:
    agent_a = create_persona_agent(persona_a_id)
    agent_b = create_persona_agent(persona_b_id)

    env_a = YachtEnv()
    env_b = YachtEnv()

    lead_changes = 0
    prev_leader = "TIE"
    rounds_log = []

    for r in range(1, 13):
        # A Turn
        while env_a.roll_count < 3:
            holds = agent_a.decide_hold(list(env_a.current_dice), env_a.roll_count, env_a.get_available_categories())
            if all(holds):
                break
            env_a.roll(holds)
        cat_a = agent_a.decide_category(list(env_a.current_dice), env_a.roll_count, env_a.get_available_categories())
        pts_a = env_a.score(cat_a)
        dopa_a = agent_a.last_dopamine_level
        diag_a = agent_a.last_dialogue

        # B Turn
        while env_b.roll_count < 3:
            holds = agent_b.decide_hold(list(env_b.current_dice), env_b.roll_count, env_b.get_available_categories())
            if all(holds):
                break
            env_b.roll(holds)
        cat_b = agent_b.decide_category(list(env_b.current_dice), env_b.roll_count, env_b.get_available_categories())
        pts_b = env_b.score(cat_b)
        dopa_b = agent_b.last_dopamine_level
        diag_b = agent_b.last_dialogue

        curr_leader = "A" if env_a.total_score > env_b.total_score else ("B" if env_b.total_score > env_a.total_score else "TIE")
        is_lead_change = False
        if curr_leader != "TIE" and curr_leader != prev_leader and prev_leader != "TIE":
            lead_changes += 1
            is_lead_change = True
        prev_leader = curr_leader

        rounds_log.append({
            "round": r,
            "a": {
                "category": cat_a,
                "points": pts_a,
                "total": env_a.total_score,
                "dopamine": dopa_a,
                "dialogue": diag_a,
                "dice": list(env_a.current_dice),
            },
            "b": {
                "category": cat_b,
                "points": pts_b,
                "total": env_b.total_score,
                "dopamine": dopa_b,
                "dialogue": diag_b,
                "dice": list(env_b.current_dice),
            },
            "leader": curr_leader,
            "is_lead_change": is_lead_change,
        })

    if env_a.total_score > env_b.total_score:
        winner = "A"
    elif env_b.total_score > env_a.total_score:
        winner = "B"
    else:
        winner = "DRAW"

    return {
        "persona_a": agent_a.spec,
        "persona_b": agent_b.spec,
        "winner": winner,
        "score_a": env_a.total_score,
        "score_b": env_b.total_score,
        "diff": abs(env_a.total_score - env_b.total_score),
        "lead_changes": lead_changes,
        "upper_bonus_a": env_a.upper_bonus,
        "upper_bonus_b": env_b.upper_bonus,
        "rounds": rounds_log,
    }
