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
        cat = context.get("cat", "")
        pts = context.get("points", 0)
        dopamine = self.last_dopamine_level
        my_total = context.get("my_total", 0)
        opp_total = context.get("opp_total", 0)
        is_leading = my_total > opp_total

        if self.name == "Jackpot":
            if cat == "Yacht" and pts == 50:
                return f"🔥 \"끼야호오오오옥!! 50점 야추 떴다아아악!! 잭팟 폭발!! 설탕물 100L 원샷 간다 붕붕붕!! (도파민 {dopamine:.0f}%)\""
            elif pts == 0:
                return f"💀 \"0점 박았다... 한강물 온도 체크 들어간다 붕... 날 믿고 베팅한 흑우들 꽉 잡아라 ㅋㅋㅋ (도파민 {dopamine:.0f}%)\""
            elif is_leading and dopamine >= 150:
                return f"👑 \"뒤집었다 캬캬캬!! 도파민 풀악셀 찌이익-!! 도박의 신이시여 영원하라 붕붕!! (도파민 {dopamine:.0f}%)\""
            elif dopamine >= 160:
                return f"🔥🔥 \"도파민 수치 폭발!! 심장이 터질 것 같아 붕! 인생은 숏 말고 롱이다 가즈아아!! (도파민 {dopamine:.0f}%)\""
            elif dopamine <= 65:
                return f"📉 \"멘탈 갈려나간다 붕... 주작판 멈춰! 하지만 다음 판에 100배 레버리지 땡기면 복구돼! (도파민 {dopamine:.0f}%)\""
            else:
                return f"🎲 \"굴려 굴려! 인생 뭐 있냐, 한 방만 터지면 내가 아레나의 지배자다 붕! (도파민 {dopamine:.0f}%)\""
        elif self.name == "Newton":
            if context.get("upper_bonus", 0) > 0 and pts > 0:
                return f"🎓 \"상단 63점 돌파, 보너스 35점 입금 완료. 이것이 바로 '과학적 참교육'입니다. (도파민 {dopamine:.0f}%)\""
            elif pts >= 30:
                return f"📊 \"기댓값 오차범위 0.002% 내에서의 필연적 수렴. 수학 앞에 무릎 꿇으십시오, 미개한 단세포들아. (도파민 {dopamine:.0f}%)\""
            elif pts == 0:
                return f"📉 \"어...? 연산 회로 에러?! 저 빡통의 무지성 샷은 들어가고 내 정밀 계산이 빗나가?! 물리법칙 개판이네 삐빅! (도파민 {dopamine:.0f}%)\""
            elif is_leading:
                return f"🧊 \"상대 검투사의 뇌 용적 0.1mm³ 이슈가 심각하군요. 저런 파멸적 무빙은 아메바도 안 합니다. (도파민 {dopamine:.0f}%)\""
            elif dopamine <= 70:
                return f"📊 \"엔트로피 급상승... 서브옵티멀 헷징으로 버팁니다. 침착해라 뉴런들아. (도파민 {dopamine:.0f}%)\""
            else:
                return f"🧠 \"분산(Variance) 통제 완료. 계획된 알고리즘대로 1밀리초의 낭비 없이 스코어링합니다. (도파민 {dopamine:.0f}%)\""
        elif self.name == "Speeder":
            if cat in ("LargeStraight", "SmallStraight") and pts > 0:
                return f"⚡ \"부와아아앙!! 12345 일직선 초고속 질주!! 내 뒤통수 먼지나 마셔라 굼벵이 녀석아! (도파민 {dopamine:.0f}%)\""
            elif pts == 0:
                return f"💥 \"으아악 코너에서 미끄러졌다!! 1번 주사위 너 이 자식 나와 맞짱까자 ㅂㄷㅂㄷ! (도파민 {dopamine:.0f}%)\""
            elif is_leading:
                return f"🏎️ \"꼬리잡기 들어간다 딱 대라!! 브레이크 뽑았다! 망설이면 뭐다? 비둘기 밥이다 붕붕!! (도파민 {dopamine:.0f}%)\""
            elif dopamine >= 150:
                return f"🔥 \"풀악셀 밟아!! 시속 300km로 돌진한다!! 날개 꺾여도 난 직진이야 붕붕붕! (도파민 {dopamine:.0f}%)\""
            else:
                return f"💨 \"고민은 사치다! 1초 만에 족보 박고 다음 라운드로 달린다 붕! (도파민 {dopamine:.0f}%)\""
        elif self.name == "Chimera":
            if pts >= 40 or (cat == "Yacht" and pts == 50):
                return f"🌌 \"시공간 웜홀 개방!! 은하계 칠차원 주사위와 영혼이 동기화되었다 붕... 경외하라! (도파민 {dopamine:.0f}%)\""
            elif pts == 0:
                return f"👾 \"버그 났다 삐-익! 내 뉴런이 비트코인 채굴에 동원되고 있어 살려줘 ㅋㅋㅋ 붕? 붕붕? (도파민 {dopamine:.0f}%)\""
            elif dopamine >= 170:
                return f"🌀 \"주사위 눈에서 오로라가 보여... 이것이 카오스 이론이다 인간들아 캬캬캬! (도파민 {dopamine:.0f}%)\""
            elif dopamine <= 60:
                return f"👽 \"평행우주의 내가 주사위를 던졌는데 저승으로 날아갔다... 외계 전파 방해 멈춰! (도파민 {dopamine:.0f}%)\""
            else:
                return f"🔮 \"이 선택의 의미는 신도 모른다. 우주의 주사위는 이미 굴러갔다 붕! (도파민 {dopamine:.0f}%)\""
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
        rolls_a = []
        while env_a.roll_count < 3:
            current_dice = list(env_a.current_dice)
            holds = agent_a.decide_hold(current_dice, env_a.roll_count, env_a.get_available_categories())
            rolls_a.append({
                "roll": env_a.roll_count,
                "dice": current_dice,
                "holds": [bool(h) for h in holds]
            })
            if all(holds):
                break
            env_a.roll(holds)

        if len(rolls_a) == 0 or rolls_a[-1]["dice"] != list(env_a.current_dice):
            rolls_a.append({
                "roll": env_a.roll_count,
                "dice": list(env_a.current_dice),
                "holds": [True] * 5
            })

        cat_a = agent_a.decide_category(list(env_a.current_dice), env_a.roll_count, env_a.get_available_categories())
        pts_a = env_a.score(cat_a)
        dopa_a = agent_a.last_dopamine_level
        diag_a = agent_a._generate_dialogue("score", {
            "cat": cat_a,
            "points": pts_a,
            "my_total": env_a.total_score,
            "opp_total": env_b.total_score,
            "upper_bonus": env_a.upper_bonus,
            "dice": list(env_a.current_dice)
        })
        sb_a = {k: v for k, v in env_a.score_board.items() if v is not None}

        # B Turn
        rolls_b = []
        while env_b.roll_count < 3:
            current_dice = list(env_b.current_dice)
            holds = agent_b.decide_hold(current_dice, env_b.roll_count, env_b.get_available_categories())
            rolls_b.append({
                "roll": env_b.roll_count,
                "dice": current_dice,
                "holds": [bool(h) for h in holds]
            })
            if all(holds):
                break
            env_b.roll(holds)

        if len(rolls_b) == 0 or rolls_b[-1]["dice"] != list(env_b.current_dice):
            rolls_b.append({
                "roll": env_b.roll_count,
                "dice": list(env_b.current_dice),
                "holds": [True] * 5
            })

        cat_b = agent_b.decide_category(list(env_b.current_dice), env_b.roll_count, env_b.get_available_categories())
        pts_b = env_b.score(cat_b)
        dopa_b = agent_b.last_dopamine_level
        diag_b = agent_b._generate_dialogue("score", {
            "cat": cat_b,
            "points": pts_b,
            "my_total": env_b.total_score,
            "opp_total": env_a.total_score,
            "upper_bonus": env_b.upper_bonus,
            "dice": list(env_b.current_dice)
        })
        sb_b = {k: v for k, v in env_b.score_board.items() if v is not None}

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
                "dice": list(rolls_a[-1]["dice"]),
                "holds": list(rolls_a[-1]["holds"]),
                "rolls": rolls_a,
                "score_board": sb_a,
                "upper_bonus": env_a.upper_bonus,
            },
            "b": {
                "category": cat_b,
                "points": pts_b,
                "total": env_b.total_score,
                "dopamine": dopa_b,
                "dialogue": diag_b,
                "dice": list(rolls_b[-1]["dice"]),
                "holds": list(rolls_b[-1]["holds"]),
                "rolls": rolls_b,
                "score_board": sb_b,
                "upper_bonus": env_b.upper_bonus,
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
