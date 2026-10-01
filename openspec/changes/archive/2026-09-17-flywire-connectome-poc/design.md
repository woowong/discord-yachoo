## Context

초파리 커넥톰(FlyWire FAFB 데이터셋)은 약 139,000개의 뉴런과 5,450만 개의 시냅스로 구성된 거대한 생물학적 유향 그래프입니다. 이 전체 뇌를 처음부터 다루는 것은 로컬 PoC 단계에서 과도한 메모리와 통신 비용을 유발합니다.
따라서 본 설계는 학습과 의사결정에 직결되는 **Mushroom Body(버섯체) 서브그래프**만을 타겟팅하여 격리된 Python 실험 디렉토리(`experiments/flywire-poc`)에서 추출하고, 로컬에서 가볍게 순방향 스파이크 시뮬레이션을 수행하는 아키텍처를 정의합니다.

## Goals / Non-Goals

**Goals:**
- 기존 TypeScript 코드베이스와 완전히 분리된 독립 Python 가상환경(`experiments/flywire-poc`) 구성.
- `caveclient`를 활용하여 FlyWire FAFB v783 데이터셋으로부터 버섯체 관련 뉴런(KC, MBON 등) 시냅스 연결 데이터 추출.
- 추출된 그래프를 오프라인에서 재사용 가능한 로컬 희소 행렬 파일(`npz`) 및 메타데이터(`json`)로 저장.
- NumPy 기반 경량 LIF(Leaky Integrate-and-Fire) 엔진으로 순방향 스파이크 전파(Forward-pass)가 동작함을 검증.

**Non-Goals:**
- 시냅스 가소성 학습(STDP, RL, Neuroevolution 등) 적용 (학습 방법은 신호 전달 검증 이후 단계에서 진행).
- Yacht 게임 상태와의 연결 및 디스코드 봇 통합.
- 13.9만 개 전체 뇌 시뮬레이션.

## Decisions

### 1. 프로젝트 격리 (`experiments/flywire-poc`)
- **결정**: 메인 프로젝트 루트 아래 `experiments/flywire-poc` 서브패키지로 두고, `pyproject.toml`을 통해 의존성을 격리.
- **대안**: 
  - *별도 Git 저장소*: 관리 포인트가 2개로 나뉘어 초반 PoC 탐색에 오버헤드 발생.
  - *TypeScript SNN 직접 구현*: FAFB 원본 데이터셋 쿼리 라이브러리(`caveclient`, `fafbseg`)가 Python 중심이므로 데이터 추출 단계에서 불리함.

### 2. 대상 서브그래프: 버섯체 (Mushroom Body)
- **결정**: 후각/다감각 패턴 인식 및 의사결정을 담당하는 Kenyon Cells(KC) $\sim$ MB Output Neurons(MBON) 시냅스 회로만 필터링.
- **이유**: 뉴런 수가 수천 개 수준으로 압축되어 로컬 환경(M-series Mac)에서 밀리초 단위로 수만 스텝 시뮬레이션 가능.
- **대안**:
  - *전체 뇌(Whole brain)*: 5,450만 시냅스로 인해 대화형 탐색 및 검증이 느림.
  - *Central Complex(CX)*: 공간 탐색에 특화되어 있어 향후 야추 게임 패턴 인식에는 MB가 더 적합.

### 3. 로컬 데이터 포맷: `scipy.sparse` npz + JSON
- **결정**: 원격 API 1회 쿼리 후 연결 관계를 `scipy.sparse.csr_matrix` 형태로 `.npz` 저장, 뉴런 메타데이터는 `.json`으로 저장.
- **이유**: 매번 원격 CAVE 서버를 호출하지 않고 완전한 오프라인 로컬 테스트가 가능하며 로딩 속도가 수 ms 이내임.

### 4. 시뮬레이션 엔진: NumPy 기반 Vectorized LIF
- **결정**: PyTorch나 무거운 딥러닝 프레임워크 대신 순수 NumPy로 Leaky Integrate-and-Fire 벡터 연산 구현.
  - $V[t] = V[t-1] \cdot \alpha + W \cdot S[t-1] + I_{\text{ext}}$
  - $S[t] = (V[t] \ge V_{\text{th}})$
  - Reset $V[t]$ where $S[t] = 1$
- **이유**: 의존성이 극히 가볍고, CPU 환경에서 수천 개 뉴런의 Forward pass를 수 밀리초 안에 즉시 실행할 수 있음.

## Risks / Trade-offs

- **[FlyWire 토큰 및 네트워크 필요]** → CAVE API 접근 시 유저의 개인 토큰 발급 필요. 환경변수(`FLYWIRE_TOKEN` 또는 CAVE 설정) 가이드를 명시하고 토큰 유효성 검사 로직을 둔다.
- **[서브그래프 절단으로 인한 신호 소멸]** → 버섯체 외부로부터 들어오는 순환 연결이 끊겨 신호가 급격히 감쇄할 수 있음. 입력 뉴런(입력 KC)에 적절한 외부 주입 전류($I_{\text{ext}}$)를 부여하여 발화가 MBON까지 도달하도록 임계치를 튜닝한다.
