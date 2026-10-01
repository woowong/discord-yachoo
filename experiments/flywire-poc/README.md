# FlyWire Connectome PoC (Phase 1)

FlyWire FAFB 커넥톰 데이터셋으로부터 버섯체(Mushroom Body) 서브그래프를 추출하고, 로컬 SNN(LIF) 순방향 전파를 검증하는 독립 샌드박스입니다.

## 사전 준비 (Setup)

1. Python 3.11 가상환경 생성 및 의존성 설치:
   ```bash
   uv venv --python 3.11
   source .venv/bin/activate
   uv pip install -e .
   ```

2. FlyWire CAVE API Token 설정:
   - https://codex-staging.flywire.ai/?dataset=fafb 또는 https://global.daf-apis.com/auth/api/v1/user/token 에서 토큰 발급
   - `.env` 파일 생성:
     ```bash
     cp .env.example .env
     ```
   - `FLYWIRE_CAVE_TOKEN=your_token_here` 입력

## 실행 방법

- **서브그래프 추출**:
  ```bash
  python src/extract.py
  ```
- **로컬 SNN 순방향 신호 전달 시뮬레이션**:
  ```bash
  python src/forward_sim.py
  ```
