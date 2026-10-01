# Proposal: Colosseum Full Roll-by-Roll Live Broadcast via Python SNN Server

## Why
사용자는 초파리 콜로세움 경기에서 라운드 결과만 보는 것이 아니라, 실제 인간 대 인간/인간 대 초파리 게임처럼 각 초파리가 주사위를 1차 굴리고, 락을 걸고, 2차 굴리고, 3차 굴리고, 족보를 확정하는 모든 극적인 과정을 1.5~2초 딜레이로 생생하게 관전하길 원합니다.
12라운드 전체에 걸쳐 양 초파리의 모든 주사위 롤(총 70~80회 이상의 렌더링 갱신)을 여유로운 템포로 방송하려면 약 2~3분이 소요되며, 이는 Cloudflare Worker의 `ctx.waitUntil` 30초 강제 종료 제한을 벗어납니다. 따라서 지속적으로 구동 중인 Python SNN 서버(`fly-brain-snn`)가 백그라운드 스레드에서 Discord REST API로 실시간 중계를 진행하도록 구조를 고도화합니다.

## What Changes
1. **Python SNN 서버 방송 엔드포인트 (`POST /api/fly/colosseum/broadcast`)**:
   - `web_server.py`에 콜로세움 백그라운드 브로드캐스터 추가.
   - 결투 시작 시 12라운드 시뮬레이션 데이터를 바탕으로, 각 라운드별 초파리 A의 1차/2차/3차 굴림 & 락 ➔ 족보 확정, 이어서 초파리 B의 1차/2차/3차 굴림 & 락 ➔ 족보 확정 과정을 1.2~1.5초 딜레이로 디스코드 메시지에 순차 렌더링.
   - 전체 ASCII 스코어보드, 주사위 이모지(⚀⚁⚂...), 락 이모지(`🔒`), 도파민 게이지, 상황별 인캐릭터 대사를 매 롤마다 갱신.
2. **Cloudflare Worker 결투 위임 및 콜백 정산 엔드포인트 (`POST /api/colosseum/settle`)**:
   - `startColosseumDuel`에서 Python 서버로 방송을 위임하고 디스코드 인터랙션에 즉시 성공 응답.
   - 만약 Python 서버 연결이 불가능할 경우, Worker 내부 12라운드 라운드별 요약 방송으로 자동 폴백.
   - 방송 종료 시 Python 서버가 Worker의 `/api/colosseum/settle`을 호출하거나, Worker가 D1 베팅 정산 및 ELO 지급을 안전하게 마무리.
3. **안정성 및 레이트 리밋 보호**:
   - 롤 간 딜레이를 1.2~1.5초로 유지하여 Discord의 5 req / 5 sec 레이트 리밋을 안전하게 준수.
   - 3D 커넥톰 두뇌 뷰어 링크와 실시간 도파민/시냅스 상태 지속 표기.
