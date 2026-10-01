## Why

초파리 커넥톰 SNN(1,575개 뉴런, 27,664개 시냅스)의 Yacht 의사결정 과정을 실시간으로 관찰할 수 있는 시각화 인터페이스가 필요합니다.
Tailscale 사설 네트워크(`100.85.188.7:8765`)를 통해 모바일, 태블릿, PC 어디서나 실시간으로 초파리 버섯체(Mushroom Body)의 뉴런 스파이크 발화와 전압 파동을 직관적으로 감상할 수 있게 하고, 향후 Discord 봇 플레이 중계(Spectator Mode)와도 매끄럽게 결합할 수 있는 웹 기반 스트리밍 토대를 구축합니다.

## What Changes

- **경량 실시간 스트리밍 웹 서버 (`experiments/flywire-poc/src/web_server.py`)**:
  - Python 표준 라이브러리(`http.server`, `socketserver`) 기반의 독립 경량 서버 구현 (외부 프레임워크 무설치 구동).
  - `0.0.0.0:8765` 바인딩을 통해 로컬(`localhost:8765`) 및 Tailscale(`100.85.188.7:8765`) 원격 접속 지원.
  - REST API 및 Server-Sent Events (SSE) 지원으로 실시간 스파이크 데이터 스트리밍.
- **HTML5 Canvas 뇌 활동 시각화 대시보드 (`experiments/flywire-poc/web/`)**:
  - 버섯체(Mushroom Body) 2D 해부학적 구조 렌더링:
    * Antennal Lobe PNs (50개): 주사위 감각 입력 시 초록색 네온 발화
    * Kenyon Cells (1,500개): Calyx/Lobe 군집에서 황금색 스파크 연쇄 전파
    * APL giant neuron: 과열 방지 보라색 억제 파동
    * MBONs (24개): 최종 행동 선택 뉴런의 붉은색 의사결정 펄스
  - 주사위 롤링 & 홀드 실시간 애니메이션, 12라운드 점수판 동기화.
  - 밀리초(ms) 단위 스파이크 래스터(Spike Raster) 오실로스코프.
  - 조작 패널: [1턴 진행], [1게임 자동 진행], [슬로우 모션 배속 조절], [새 게임].
- **Discord 관전 연동 준비**:
  - 향후 Discord 웹훅이나 게임 오케스트레이터에서 실시간으로 상태를 쏴줄 수 있는 범용 SSE 브로드캐스터 설계.

## Capabilities

### New Capabilities
- `flywire-realtime-web-visualizer`: 초파리 커넥톰 실시간 웹 시각화 및 Tailscale 원격 스트리밍 서버

### Modified Capabilities
*(None - 기존 도메인 엔진 사양은 수정 없이 보존되며 순수 프리젠테이션/스트리밍 계층 추가)*

## Impact

- `experiments/flywire-poc/` 내에 `src/web_server.py` 및 `web/` 정적 에셋 추가.
- 기존 TypeScript 메인 코드베이스나 Cloudflare Worker 인프라에 영향 없음.
- Tailscale IP `100.85.188.7:8765`를 통해 외부 기기 브라우저에서 즉시 접근 가능.
