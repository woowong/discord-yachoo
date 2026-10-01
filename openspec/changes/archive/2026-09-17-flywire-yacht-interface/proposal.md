## Why

Phase 1에서 FlyWire 커넥톰의 버섯체(Mushroom Body) 서브그래프를 성공적으로 추출하고, 로컬 SNN에서 감각 자극이 출력(MBON) 뉴런까지 순방향 전달됨을 입증하였습니다.
이제 실제 Yacht(야추) 게임의 동적 상태(주사위 눈, 리롤 횟수, 잔여 점수판 카테고리)를 초파리의 감각 신호로 변환하고, 뇌의 발화 결과를 유효한 야추 조작(주사위 리롤/홀드 및 카테고리 선택)으로 디코딩하여, 초파리 에이전트가 12라운드 야추 1게임을 규칙 위반 없이 끝까지 완주할 수 있는지 기술적 개념증명(Phase 2)을 수행합니다.

## What Changes

- **Yacht 상태 감각 인코더 (Sensory Encoder) 구현**:
  - 현재 5개 주사위 눈(30채널 One-hot or Population rate) + 리롤 횟수(3채널) + 사용 가능한 카테고리(12채널) = 총 45~50개의 투사 뉴런(PN) 외부 주입 전류로 변환.
- **초파리 운동/결정 디코더 (Motor & Decision Decoder) 구현**:
  - 롤링 단계: MBON 상위 뉴런들의 발화 빈도를 기준으로 5개 주사위의 유지(Hold)/재굴림(Reroll) 마스크 도출.
  - 점검/기록 단계: MBON 하위 뉴런들의 발화 경쟁(Argmax with Masking)을 통해 잔여 카테고리 중 1개 선택.
- **로컬 야추 시뮬레이션 환경 (Python Yacht Game Engine)**:
  - TypeScript 도메인의 Yacht 룰과 100% 일치하는 가벼운 독립형 게임 환경(`yacht_env.py`) 작성.
- **초파리 1게임 완주 벤치마크 러너 (`run_game.py`)**:
  - 초파리 뇌가 12턴 동안 유효한 행동을 연속해서 생성하여 최종 점수를 산출하는 엔드투엔드 루프 검증.
  - 무작위 에이전트(Random Agent)와의 1게임 완주율 및 점수 분포 비교 벤치마크.

## Capabilities

### New Capabilities
- `flywire-yacht-sensory-motor`: Yacht 게임의 보드 상태를 생물학적 감각 뉴런 자극으로 인코딩하고, 출력 MBON 발화 패턴을 주사위 홀드 및 카테고리 선택 액션으로 디코딩하는 인터페이스.
- `flywire-game-loop-runner`: 초파리 SNN 에이전트가 12라운드 전체 야추 게임을 자율적으로 완주하고 턴별 의사결정 추적 로그 및 최종 스코어를 생성하는 시뮬레이터.

### Modified Capabilities
(없음: 본체 TypeScript 프로덕션 시스템과 격리된 `experiments/flywire-poc` 내에서 수행)

## Impact

- **실행 환경**: `experiments/flywire-poc/src/` 내에 `encoder.py`, `decoder.py`, `yacht_env.py`, `run_game.py` 파일 추가.
- **성능 영향**: 로컬 M-series Mac 환경에서 1게임(12턴 x 최대 3회 롤링 $\approx$ 약 36회 SNN 추론) 실행에 20ms 미만 소요 예상.
- **프로덕션 코드 영향**: 없음 (독립 실험 샌드박스).
