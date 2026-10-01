## Context

Phase 3과 4의 실측 분석 결과, 초파리 뇌가 43점에 갇혔던 가장 큰 이유는 3,100만 개의 주사위-카테고리 산술 맵핑을 맨땅에서 외워야 했기 때문이었습니다.
본 설계는 생태 심리학의 핵심 개념인 **감각 행위유발성(Affordance)**을 투사 뉴런에 직접 연결하고, 4개의 독립된 **다대륙 섬 모델(Island Model)**을 구동하여 초파리 뇌를 인간 수준인 150~200점대로 도약시키는 기술적 청사진입니다.

## Goals / Non-Goals

**Goals:**
- PN 33..44에 카테고리별 잠재 득점 강도($Points / 50.0 \times 2.0$)를 직접 주입하는 Affordance 인코더 구현.
- 투 페어(`[3, 3, 5, 5, x]`) 보존 및 포카드 락 인 기전을 포함하는 고차 롤링 디코더 구현.
- 0점 함정을 원천 차단하는 가치 기반 행동 선택(Action-Outcome Filter) 구현.
- 4개 특화 섬(Island) 및 20세대 주기 교배를 지원하는 `island_evolution.py` 구현.
- 150세대 진화를 통해 평균 120~150점+, 최고 180~200점 달성 실측.

**Non-Goals:**
- GPU 텐서플로우/파이토치 외부 의존성 (순수 NumPy/SciPy 기반 고속 시뮬레이션 유지).

## Decisions

### 1. 감각 행위유발성 (Affordance) 매핑
- **결정**: 기존에 단순히 0 or 1로 넣던 PN 33..44 입력에 `calculate_score(cat, dice) / 50.0 * 2.0` 값을 주입.
- **이유**: 초파리 뇌가 3,100만 개의 사칙연산 곱셈을 백지상태에서 외우는 불가능한 과제를 제거하고, "상단 보너스를 노릴 것인가, 풀하우스를 채울 것인가"라는 고차원 가치 판단(Valence Arbitration)에만 집중하도록 유도.

### 2. 다대륙 섬 모델 (Island Model Speciation)
- **섬 1 (Jackpot Island)**: Yacht/Straight 위주 도파민 편향.
- **섬 2 (Upper Bonus Island)**: 63점 상단 보너스 달성 시 +50점 피트니스.
- **섬 3 (Balance & Safety Island)**: 0점 최소화 및 Choice/FullHouse 안정 수확.
- **섬 4 (Hypermutation Island)**: 높은 변이율($\sigma=0.15$)로 급진적 회로 구조 탐색.
- **주기적 이주(Migration)**: 매 20세대마다 각 섬의 1위 챔피언이 다른 섬으로 이주하여 교배.

## Risks / Trade-offs

- **[단순 룰 기반 봇으로의 전락 위험]** → 해결책: Affordance 신호는 감각 뉴런(PN)에 공급되는 '외부 자극'일 뿐이며, 최종 선택과 주사위 롤링 결정은 여전히 1,575개 뉴런의 LIF SNN 스파이크와 KC-MBON 시냅스 가중치에 의해 자율적으로 결정됨.
