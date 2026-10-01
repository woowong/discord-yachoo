## Context

초파리 커넥톰 SNN의 Phase 5 슈퍼 챔피언(`data/super_champion_fly.npz`)은 1,575개 뉴런의 스파이크 신호 처리를 통해 평균 109.7점, 최고 223점의 성능을 내고 있습니다.
본 설계는 이 1,575개 뉴런의 15ms 밀리초 단위 스파이크 발화 과정을 브라우저상에서 실시간 네온 뇌파로 시각화하고, Tailscale 사설망(`100.85.188.7`)을 통해 원격 모바일/태블릿에서 실시간 관전할 수 있도록 구축하는 기술 청사진입니다.

## Goals / Non-Goals

**Goals:**
- 외부 의존성(Node/npm, Flask/FastAPI 등)이 전혀 없는 순수 Python 표준 라이브러리 기반 멀티스레드 스트리밍 서버 구현 (`experiments/flywire-poc/src/web_server.py`).
- `0.0.0.0:8765` 바인딩을 통한 Tailscale(`100.85.188.7:8765`) 및 로컬 원격 접속 지원.
- 1,575개 뉴런의 실시간 2D 해부학적 좌표 매핑 및 HTML5 Canvas 네온 파티클 렌더링.
- 턴별 15ms 스파이크 타임라인 희소 압축 전송 (< 40KB payload).
- [1턴 수동 진행], [자동 플레이], [슬로우 모션 뇌파 분해 관찰], [실시간 점수판 동기화].
- 향후 Discord 봇 경기 실시간 중계를 위한 SSE(`/events`) 브로드캐스팅 파이프라인 탑재.

**Non-Goals:**
- 무거운 3D WebGL 엔진(Three.js/Babylon) 의존 (가벼운 모바일 브라우저에서도 60fps로 동작할 수 있도록 순수 HTML5 2D Canvas로 구현).

## Decisions

### 1. Python 표준 라이브러리 `http.server.ThreadingHTTPServer` 채택
- **결정**: 외부 패키지 설치 없이 `http.server`와 `socketserver.ThreadingMixIn`만으로 HTTP + SSE 서버 구현.
- **이유**: `experiments/flywire-poc/.venv`에 추가 패키지를 깔 필요가 없고, 가볍고 안정적이며 포트 충돌 없이 단일 명령어로 즉시 구동 가능.

### 2. 신경 텔레메트리 데이터 희소(Sparse) 압축
- **결정**: 1,575개 뉴런의 $15\text{ steps} \times 1,575\text{ float32}$ 전압 행렬을 통째로 보내지 않고, 각 밀리초마다 발화한 뉴런 인덱스 리스트(`spikes_by_step: List[List[int]]`)와 주요 MBON 전압만 직렬화.
- **이유**: 모바일 기기(Tailscale 연결 스마트폰)에서도 랙 없이 60fps로 실시간 스파이크 펄스를 부드럽게 렌더링 가능.

### 3. 초파리 버섯체 2D 해부학적 클러스터 좌표 매핑
- **PN (50개)**: 좌측 호(Arc) 형태로 안테나 후각 신경 배치.
- **KC (1,500개)**: 중앙 Calyx 및 α/β, α'/β', γ 엽(Lobe)의 3개 클러스터로 고밀도 배치.
- **APL (1개)**: 중앙 코어에 위치한 거대 억제 뉴런 (발화 시 보라색 충격파 애니메이션).
- **MBON (24개)**: 우측 상하단에 족보/행동별 보상 밸브 형태로 배치.

### 4. Discord 관전(Spectator Mode) 확장 인터페이스
- `POST /api/broadcast_turn`: 외부(Discord 봇 경기 엔진)에서 발생한 주사위 턴 데이터를 전달받아 브라우저 화면에 실시간 미러링.

## Risks / Trade-offs

- **[모바일 화면 해상도 대응]** → 해결책: Canvas 내부 해상도를 반응형 리사이징(Retina 2x Scaling)으로 처리하여 스마트폰 세로 모드에서도 선명하게 렌더링.
- **[Tailscale 방화벽 차단]** → 해결책: 기본 `0.0.0.0` 바인딩을 적용하여 로컬 루프백과 Tailscale 가상 인터페이스(`utun`) 양쪽 모두 자동 수신.
