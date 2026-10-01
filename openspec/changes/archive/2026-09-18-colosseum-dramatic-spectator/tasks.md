## 1. Python SNN Persona Telemetry & Kitsch Dialogues

- [x] 1.1 `experiments/flywire-poc/src/personas.py`의 대사 생성 로직(`_generate_dialogue`)을 매운맛 B급/도박/자폭/도파민 풀악셀 밈 대사로 전면 개편하고 단위 테스트로 검증
- [x] 1.2 `experiments/flywire-poc/src/personas.py`의 `simulate_colosseum_duel`에서 라운드별 3회 롤 상세 내역(`rolls: [{ dice, holds }]`) 및 누적 `scoreBoard` 스냅샷을 기록하도록 확장하고 pytest로 검증

## 2. Presentation Layer & Full Scoreboard Serializer

- [x] 2.1 `src/presentation/discord/adapter/serializer.ts`에 콜로세움 2인 ASCII 전체 점수판 포매터와 주사위 락 표시기능(`serializeColosseumClash`)을 구현하고 단위 테스트로 검증
- [x] 2.2 6개 챕터별(R1-2, R3-4, R5-6, R7-8, R9-10, R11-12) 타이틀, 전황 브리핑, 실시간 도파민 및 대사 렌더링 검증

## 3. Application Workflow & Orchestration

- [x] 3.1 `src/application/GameWorkflowService.ts`의 `executeColosseumMatchLogic`를 6개 챕터 순차 갱신 및 챕터당 2.5초 지연 오케스트레이션으로 개편
- [x] 3.2 `src/application/colosseumWorkflow.test.ts`를 업데이트하여 6단계 순차 수정 및 최종 정산 라이프사이클을 단위 테스트로 검증

## 4. Verification & Deployment

- [x] 4.1 Vitest 및 Pytest 전체 테스트 스위트 100% 통과 검증 (`npm test`, `pytest`)
- [x] 4.2 Cloudflare Worker 재배포 (`wrangler deploy`) 및 Python SNN 서버 재시작
