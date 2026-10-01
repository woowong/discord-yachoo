## Why

Phase 1(버섯체 서브그래프 추출)과 Phase 2(야추 상태 인코더/디코더 인터페이스)를 통해 초파리 SNN 에이전트가 12라운드 게임을 룰 위반 없이 100% 자율 완주할 수 있음을 입증하였습니다.
그러나 현재 초파리 뇌는 초기 고정 가중치 상태로 평균 38점(Random Agent는 44점)에 머물러 있습니다. 생물학적 버섯체의 핵심 학습 부위인 KC(Kenyon Cell) -> MBON 시냅스 가소성(Synaptic Plasticity)과 신경진화(Neuroevolution) 및 도파민성 보상 조절을 구현하여, 초파리 에이전트가 높은 점수를 내고 자율적인 전략을 형성하도록 최적화(Phase 3)를 진행합니다.

## What Changes

- **KC -> MBON 시냅스 가소성 엔진 (`synaptic_plasticity.py`)**:
  - 생물학적 사실에 부합하도록 고정된 PN->KC/APL 배선을 유지한 채, KC->MBON 시냅스 가중치만을 선별적으로 변이 및 강화하는 학습 메커니즘 구현.
- **초파리 세대 신경진화 콜로세움 (`evolution.py`)**:
  - 개체군(Population, 예: 30~50마리) 시뮬레이션, 세대별 토너먼트 야추 플레이, 피트니스 평가(평균 점수 및 보너스 달성률) 기반 상위 개체 선택 및 시냅스 가우시안 돌연변이/교배.
- **신경조절물질(도파민 vs 옥토파민) 보상 편향 실험 모듈**:
  - 대박 족보(Yacht, Straight) 지향 도파민 편향 뇌 vs 0점 회피 지향 옥토파민 편향 뇌의 가중치 학습 및 성격 발현 관찰.
- **다차원 토폴로지 비교 벤치마크 (`topology_benchmark.py`)**:
  - 실제 FlyWire 커넥톰 vs 무작위 연결 SNN vs 인공 MLP 토폴로지 간의 학습 곡선, 최고 점수, 의사결정 다양성 비교 검증.

## Capabilities

### New Capabilities
- `flywire-synaptic-plasticity`: 버섯체 KC->MBON 시냅스 가중치를 최적화(신경진화 및 보상 조절)하여 야추 플레이 성능을 향상시키는 가소성 엔진.
- `flywire-tournament-benchmark`: 세대별 진화 추적, 토폴로지 대조군(초파리 vs 랜덤망 vs MLP) 비교, 초파리 뇌 활동(MBON 발화) 리포트를 산출하는 벤치마크 시스템.

### Modified Capabilities
(없음: `experiments/flywire-poc` 내 독립 실험으로 수행)

## Impact

- **실행 환경**: `experiments/flywire-poc/src/`에 `evolution.py`, `synaptic_plasticity.py`, `topology_benchmark.py` 등 추가.
- **성능 영향**: 1게임당 5ms의 고속 시뮬레이션을 활용하여 100세대 진화(약 30,000게임)를 로컬 CPU(Mac)에서 수 분 내 완료 가능.
- **프로덕션 코드 영향**: 없음 (독립 연구 실험 샌드박스).
