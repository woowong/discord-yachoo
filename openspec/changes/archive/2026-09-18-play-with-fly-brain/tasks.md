## 1. 로컬 Python SNN 서빙 API (`web_server.py`) 및 단위 검증

- [x] 1.1 `experiments/flywire-poc/src/web_server.py`에 `POST /api/fly/act` 핸들러를 추가하고, `FlyBrainAgent`를 통해 주사위 홀드 결정 및 카테고리 득점 결정을 반환하도록 구현.
- [x] 1.2 `experiments/flywire-poc/tests/test_act_api.py` 단위 테스트를 작성하여 주사위 입력에 따른 SNN 추론 응답 포맷(hold/score 유효성) 검증.

## 2. PM2 프로세스 관리 (Self-recovery) 및 Cloudflare Tunnel 실행 검증

- [x] 2.1 `experiments/flywire-poc/ecosystem.config.cjs`를 작성하여 파일 변경 감지(watch), 장애 시 자동 재시작(autorestart), 지연 백오프 등 self-recovery 설정 구성.
- [x] 2.2 `scripts/run-tunnel.sh` 또는 npm 스크립트를 구성하여 Cloudflare Tunnel(`cloudflared`)의 포트 8765 연결 및 구동 검증.

## 3. 매칭 대기열 및 초대장 UI에 간결한 초파리 버튼(`🪰`) 추가

- [x] 3.1 `src/presentation/discord/adapter/serializer.ts`의 `serializeMatchQueue`에 간결한 초파리 이모지 버튼(`🪰`, `queue:play_ai:<queueId>`) 추가 및 Vitest 단위 테스트 작성.
- [x] 3.2 `src/presentation/discord/adapter/serializer.ts`의 `serializeInvitation`에 간결한 초파리 이모지 버튼(`🪰`, `invitation:play_ai:<invitationId>`) 추가 및 Vitest 단위 테스트 작성.

## 4. Worker 인터랙션 핸들러 및 AI 전환 로직 구현

- [x] 4.1 `src/application/GameWorkflowService.ts`에 `playWithFlyAiFromQueue` 및 `playWithFlyAiFromInvitation` 메서드를 추가하여 `AI_FLY_BRAIN`과의 1:1 대전 세션을 생성하는 비즈니스 로직 구현 및 단위 테스트 작성.
- [x] 4.2 `src/presentation/discord/handlers/components.ts`에 `queue:play_ai:*` 및 `invitation:play_ai:*` 인터랙션 핸들러를 추가하고 방장/신청자 권한 검증 및 에러 메시지 처리 연결.

## 5. Worker 백그라운드 AI 턴 오케스트레이션 및 3D 두뇌 중계 링크 연동

- [x] 5.1 `src/application/GameWorkflowService.ts`에 `executeAiTurn(gameId, channelId, messageId)` 비동기 태스크를 구현하고, `FLY_BRAIN_URL`로 REST 호출하여 초파리의 주사위 롤/스코어링을 자동 진행한 후 Discord 메시지 갱신 및 유저 멘션 처리.
- [x] 5.2 게임 메시지 임베드에 초파리 대전 시 `FLY_BRAIN_URL` 기반 3D 초파리 두뇌 실시간 관전 링크(`🔗 3D 초파리 두뇌 실시간 중계`) 노출.
- [x] 5.3 오프라인 및 타임아웃 예외 시 안전하게 게임 상태를 보존하고 안내 메시지를 반환하는 Mock 기반 Vitest 단위 테스트 작성.
- [x] 5.4 전체 테스트 슈트(`npm run test` 및 Python pytest)를 실행하여 100% 정상 통과 검증.
