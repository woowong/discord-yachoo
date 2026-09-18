## 1. Presentation & Serializer

- [x] 1.1 `src/presentation/discord/adapter/serializer.ts`에 `serializeColosseumRound(match, bets, duelData, roundNumber, flyBrainUrl)` 메서드를 구현하여 1~12개 라운드별 점수표/주사위/도파민/대사를 렌더링
- [x] 1.2 `src/presentation/discord/adapter/serializer.ts`의 `serializeColosseumRolling`을 오프닝 프레임에 최적화

## 2. Application Workflow & Orchestration

- [x] 2.1 `src/application/GameWorkflowService.ts`의 `executeColosseumMatchLogic`를 [오프닝 롤링(1.5s) ➔ 1~12라운드 순차 렌더링(각 1.2s) ➔ 최종 정산(1.0s)] 구조로 개편
- [x] 2.2 `src/application/colosseumWorkflow.test.ts` 및 `adapter.test.ts`를 12라운드 렌더링에 맞추어 검증

## 3. Verification & Deployment

- [x] 3.1 Vitest 및 Pytest 전체 테스트 스위트 통과 검증 (`npm test`, `pytest`)
- [x] 3.2 Cloudflare Worker 재배포 (`wrangler deploy`)
- [x] 3.3 OpenSpec 동기화 및 아카이브, Git 커밋/푸시
