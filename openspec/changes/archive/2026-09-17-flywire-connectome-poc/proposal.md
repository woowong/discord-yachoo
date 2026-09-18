## Why

최근 공개된 초파리(Drosophila) 전체 뇌 커넥톰(FlyWire FAFB 데이터셋)을 활용하여 생물학적 신경망 기반으로 Yacht(야추) 의사결정을 수행하는 AI 에이전트 개발 가능성을 검증하고자 합니다. 
본 프로덕션 시스템(TypeScript / Cloudflare Worker / Discord Bot)에 직접 거대한 신경망 인프라를 통합하기 전에, Python 독립 환경(`experiments/flywire-poc`)에서 FlyWire Codex API 연결성, 버섯체(Mushroom Body) 서브그래프 추출, 로컬 SNN 순방향 신호 전달(Forward Simulation)의 기술적 타당성을 단계별로 검증(PoC)합니다.

## What Changes

- **Python 기반 격리 실험 환경(`experiments/flywire-poc`) 신설**:
  - `pyproject.toml` 기반 Python 패키지 환경(CAVEclient, scipy, numpy 등) 설정.
- **FlyWire Codex (FAFB) API 연동 모듈**:
  - FlyWire CAVE 인프라 인증 및 FAFB 데이터셋 쿼리 인터페이스 구현.
- **버섯체(Mushroom Body) 서브그래프 추출 및 로컬 캐싱**:
  - 연합 학습 및 결정 회로인 버섯체(Kenyon Cells, MBON, DAN) 관련 뉴런과 시냅스 가중치를 추출하여 로컬 파일(npz/json)로 캐싱.
- **로컬 SNN 순방향 추론(Forward Simulation) 검증 스크립트**:
  - 추출된 시냅스 인접 행렬을 기반으로 간단한 LIF(Leaky Integrate-and-Fire) 네트워크를 구동하여, 감각 뉴런 자극 시 출력 뉴런까지 스파이크가 정상 전달되는지 확인.
  - (학습 메커니즘은 본 검증 성공 후 후속 단계에서 진행)

## Capabilities

### New Capabilities
- `flywire-connectome-extract`: FlyWire FAFB CAVEclient 연동, 인증 및 버섯체 의사결정 서브그래프 추출과 로컬 정적 캐시 생성 기능.
- `flywire-forward-simulation`: 추출된 생물학적 커넥톰 인접 행렬을 로컬 SNN(LIF) 뉴런 모델로 로드하여 자극 주입 시 순방향 스파이크 전파를 검증하는 시뮬레이션 기능.

### Modified Capabilities
(없음: 본 프로젝트의 기존 Discord 봇 및 Pure Domain TS 엔진은 영향을 받지 않음)

## Impact

- **프로젝트 구조**: `experiments/flywire-poc/` 디렉토리가 신설되며 기존 TypeScript 코드베이스 및 배포 파이프라인에 사이드 이펙트가 없음.
- **외부 의존성**: FlyWire CAVE API(원격 API) 및 CAVE API 토큰 필요.
- **런타임**: Python 3.11+ 필요 (`experiments/flywire-poc` 한정).
