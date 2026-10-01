## 1. Python SNN Live Broadcaster

- [x] 1.1 `experiments/flywire-poc/src/colosseum_broadcaster.py`를 생성하여 12라운드 전 주사위 롤(1~3차 굴림, 락 선택, 족보 확정)을 Discord PATCH API로 1.2~1.5초 간격 스트리밍하는 백그라운드 워커 구현
- [x] 1.2 `experiments/flywire-poc/src/web_server.py`에 `POST /api/fly/colosseum/broadcast` 엔드포인트 추가 및 백그라운드 스레드 디스패치 연동
- [x] 1.3 Python 단위 테스트 추가 및 검증 (`pytest`)

## 2. Cloudflare Worker Delegation & Settlement Endpoint

- [x] 2.1 `src/application/GameWorkflowService.ts`의 `startColosseumDuel`에서 `POST /api/fly/colosseum/broadcast` 호출로 결투 방송 위임 및 실패 시 로컬 요약 방송 폴백 로직 추가
- [x] 2.2 `src/index.ts`에 `POST /api/colosseum/settle` 엔드포인트를 추가하여 경기 완료 시 D1 결과 갱신 및 ELO 베팅 정산 처리
- [x] 2.3 Vitest 단위 테스트 업데이트 및 검증 (`npm test`)

## 3. Verification & Deployment

- [x] 3.1 PM2 `fly-brain-snn` 서버 재시작 및 curl 테스트
- [x] 3.2 Cloudflare Worker 재배포 (`wrangler deploy`)
- [x] 3.3 OpenSpec 동기화 및 아카이브, Git 커밋/푸시
