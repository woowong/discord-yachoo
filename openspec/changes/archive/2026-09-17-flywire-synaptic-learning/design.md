## Context

Phase 1 및 Phase 2를 통해 1,575개 뉴런, 27k 시냅스의 버섯체 SNN 모델과 Yacht 환경 간의 100% 자율 완주 파이프라인이 검증되었습니다.
현재 초기 배선 상태에서는 평균 점수가 ~38점(Random Agent ~44점)에 불과하며, 실질적인 의사결정 전략이 부재합니다.
Phase 3에서는 생물학적 원리에 부합하도록 희소 연결 구조를 유지하면서 KC->MBON 시냅스 가중치를 최적화하는 신경진화(Neuroevolution) 및 보상 조절 시스템을 구축합니다.

## Goals / Non-Goals

**Goals:**
- KC -> MBON 시냅스만 국소적으로 변이/최적화하는 가소성 엔진 구현 (`synaptic_plasticity.py`).
- 세대별 토너먼트 및 개체군(Population) 기반 고속 신경진화 루프 구현 (`evolution.py`).
- 100세대 진화를 통해 평균 점수를 기존 38점에서 80~120점+ 이상으로 끌어올리는 성능 입증.
- 대조 실험군(초파리 커넥톰 vs 랜덤 Erdos-Renyi SNN vs MLP) 간의 토폴로지 비교 벤치마크 구현 (`topology_benchmark.py`).
- 도파민성 보상 편향(대박 족보 보상 vs 0점 처벌)에 따른 초파리 행동 패턴(Phenotype) 분석.

**Non-Goals:**
- 복잡한 역전파(Backpropagation through time, BPTT) 또는 대규모 GPU 훈련 (5ms/game 속도를 활용한 로컬 CPU 고속 진화로 충분).
- Discord 봇 프로덕션 실시간 Webhook 내 직접 SNN 호스팅 (본 단계는 독립 샌드박스 연구).

## Decisions

### 1. 학습 대상 시냅스의 국소화 (Local KC->MBON Synapses Only)
- **결정**: PN->KC(감각 희소 투사)와 KC->APL(억제 조절)은 실제 초파리 뇌처럼 고정하고, 오직 KC->MBON 연결(약 18,000개)만 가소성 파라미터로 설정.
- **이유**: 생물학적 타당성 유지 및 검색 공간(Search space)의 기하급수적 축소로 과적합 방지 및 빠른 수렴 달성.

### 2. 최적화 알고리즘: 신경진화 전략 (Neuroevolution / GA) 채택
- **결정**: SNN의 비연속적 스파이크 그래디언트 근사 대신, 세대별 토너먼트 선택 + 가우시안 변이 진화 전략 채택.
- **이유**: 1게임당 5ms로 극도로 빠르기 때문에 50마리 x 10판 = 500판이 2.5초만에 완료됨. 100세대 진화가 수 분 안에 끝나며 로컬 Mac CPU에서 가장 안정적임.

### 3. 피트니스 함수 (Fitness Shaping)
- **기본 피트니스**: $Fitness = \text{Game Total Score} + 30 \times \mathbb{I}(\text{Upper Bonus})$.
- **도파민 편향 모드**: Yacht/Large Straight 득점 시 가중 보너스 부여.
- **옥토파민 편향 모드**: 0점 기입 발생 시 패널티 감점 부여.

## Risks / Trade-offs

- **[초기 국소 최적해(Local Optima) 수렴]** → 특정 주사위만 집착하는 편향이 생길 위험. 해결책: 엘리트 선택(Elite retention)과 함께 적절한 탐색 변이율(Mutation rate $\sigma \approx 0.05 \sim 0.15$) 유지 및 세대 간 다양성 보존.
- **[주사위 무작위성에 따른 피트니스 분산]** → 1게임만으로는 운에 좌우될 수 있음. 해결책: 개체당 최소 5~10판의 평균 점수로 피트니스를 측정하여 통계적 신뢰성 확보.
