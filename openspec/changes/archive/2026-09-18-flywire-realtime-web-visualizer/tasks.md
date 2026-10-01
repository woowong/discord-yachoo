## 1. 백엔드 신경 텔레메트리 및 스트리밍 웹 서버 구현

- [x] 1.1 15ms 밀리초 단위 스파이크 발화 시계열을 수집하는 계측형 에이전트 구현 (`experiments/flywire-poc/src/telemetry_agent.py`)
- [x] 1.2 `0.0.0.0:8765` 바인딩, REST API (`/api/status`, `/api/step`, `/api/reset`) 및 SSE(`/events`) 스트리밍 웹 서버 구현 (`experiments/flywire-poc/src/web_server.py`)
- [x] 1.3 텔레메트리 직렬화 및 웹 서버 엔드포인트 동작 검증 단위 테스트 작성 (`experiments/flywire-poc/tests/test_web_server.py`)

## 2. 프론트엔드 커넥톰 캔버스 및 실시간 대시보드 구현

- [x] 2.1 1,575개 뉴런 2D 해부학적 좌표 매핑, 네온 스파이크 파티클 및 전파 애니메이션 구현 (`experiments/flywire-poc/web/app.js`)
- [x] 2.2 반응형 다크 테마 대시보드 레이아웃, 주사위 롤링 애니메이션, 실시간 점수판 및 스파이크 래스터 오실로스코프 UI 구현 (`experiments/flywire-poc/web/index.html`, `experiments/flywire-poc/web/style.css`)

## 3. 실시간 동작 검증 및 Tailscale 원격 연결 테스트

- [x] 3.1 웹 서버 백그라운드 구동 및 로컬/Tailscale(`100.85.188.7:8765`) HTTP/SSE 연결 실측 검증
- [x] 3.2 향후 Discord 봇 경기 중계 연동을 위한 브로드캐스트 API 검증 및 노션 보고서 공유
