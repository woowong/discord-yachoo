## Why

Phase 3에서 100세대 신경진화를 통해 챔피언 초파리가 106점을 돌파하고 인공 MLP를 앞섰으나, 고정된 APL 억제(-0.6)의 정보 병목과 단기 작업 기억의 부재로 인해 40점대 중반의 평균 점수에 갇혀 있습니다.
사용자의 제안에 따라, 초파리 뇌의 인지 구조를 고도화(APL 동적 조절, 단기 작업 기억, 뉴런 스케일링)하고, **초파리 간의 1:1 PvP 맞대결을 통한 승패 기반 도파민/옥토파민 경쟁 공진화(Competitive Co-evolution)**를 도입하여 인간 수준의 전략적 지능으로 도약하고자 합니다.

## What Changes

- **초파리 1:1 PvP 맞대결 & 공진화 엔진 (`pvp_duel.py`)**:
  - 초파리 2마리가 번갈아가며 동일 조건에서 1:1 진검승부를 펼치는 대전 모듈.
  - 승자에게는 대량의 도파민(+Victory Dopamine Reward), 패자에게는 옥토파민(-Defeat Stress Shock)을 부여하는 자기 경쟁(Self-Play) 공진화 루프.
  - 초파리 글래디에이터 간의 Elo 레이팅 및 승률 추적 시스템.
- **APL 동적 게이팅 (Dynamic Attention Mechanism)**:
  - 1차 롤링(탐색)에는 강한 억제(-0.6), 2·3차 롤링(조합 추론)에는 억제를 -0.15로 동적 완화하여 의사결정 대역폭을 4배 확장.
- **단기 작업기억 (Working Memory / Recurrence) 모듈**:
  - 이전 롤링의 의도와 주사위 정보를 보존하여 3번의 롤링에 걸쳐 일관된 족보 공략을 유지하는 순환 피드백.
- **뉴런 스케일링 (KC Scaling) 및 용량 비교 실험**:
  - 케년 세포(KC) 수를 1,500개에서 3,000~5,000개로 확장했을 때의 패턴 분리능 및 점수 영향 실측.
- **드라마틱 턴별 경기 중계 및 명경기 하이라이트 생성기**:
  - 기적의 역전승, 50점 Yacht 폭발 등 흥미진진한 경기 로그를 턴 단위로 시각화하여 노션에 공유.

## Capabilities

### New Capabilities
- `flywire-pvp-duel`: 초파리 2마리 간의 1:1 Yacht 대전, 승패 기반 도파민 보상, Elo 레이팅 산출 및 경쟁 공진화 시스템.
- `flywire-advanced-cognition`: APL 동적 주의집중 억제 조절, 롤링 간 단기 작업기억 유지, 및 대규모 KC 스케일링 지원 엔진.

### Modified Capabilities
(없음: `experiments/flywire-poc` 내 독립 실험으로 수행)

## Impact

- **실행 환경**: `experiments/flywire-poc/src/` 내에 `pvp_duel.py`, `advanced_cognition.py`, `run_pvp_experiments.py` 추가.
- **성능 영향**: 1:1 대전 시뮬레이션(2인 1게임 약 10ms) 기반 고속 토너먼트 실행.
- **프로덕션 코드 영향**: 없음 (독립 연구 실험 샌드박스).
