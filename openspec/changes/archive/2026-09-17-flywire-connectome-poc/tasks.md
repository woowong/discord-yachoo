## 1. Python 환경 및 프로젝트 격리 설정

- [x] 1.1 `experiments/flywire-poc` 디렉토리와 `pyproject.toml`, `README.md`, `.env.example` 파일을 생성하고 기본 구조가 올바르게 갖춰졌는지 확인한다.
- [x] 1.2 Python 가상환경을 구성하고 `caveclient`, `numpy`, `scipy`, `pandas` 패키지를 설치하여 정상 임포트되는지 확인한다.

## 2. FlyWire CAVE 클라이언트 및 버섯체 서브그래프 추출

- [x] 2.1 `src/client.py`를 작성하여 FAFB v783 데이터셋 연결 및 CAVE API 토큰 인증 유효성 검사 로직을 구현한다.
- [x] 2.2 `src/extract.py`를 작성하여 버섯체(Kenyon Cells 및 MBON) 시냅스 연결 테이블을 쿼리하고, 이를 희소 행렬(`scipy.sparse` npz) 및 뉴런 메타데이터(`json`)로 로컬 저장하는 기능을 구현한다.
- [x] 2.3 추출 스크립트를 실행하여 `experiments/flywire-poc/data/` 경로에 실제 유효한 인접 행렬과 메타데이터 파일이 캐싱되는지 검증한다.

## 3. 로컬 SNN 순방향 추론 (Forward Simulation) 검증

- [x] 3.1 `src/forward_sim.py`에 캐시된 npz/json을 로드하고 순수 NumPy로 Leaky Integrate-and-Fire(LIF) 막전위 및 스파이크를 계산하는 시뮬레이터를 구현한다.
- [x] 3.2 입력(Sensory/KC) 뉴런에 스파이크 펄스를 주입하고 스텝별 막전위 변화 및 출력(MBON) 뉴런의 발화 유무를 기록하는 로직을 작성한다.
- [x] 3.3 `forward_sim.py`를 실행하여 외부 입력 신호가 중간 뉴런을 거쳐 출력 뉴런까지 정상적으로 전파되는지 터미널 로그 및 지표로 검증한다.
