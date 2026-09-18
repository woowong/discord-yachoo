## 1. Presentation & Rolling Animation

- [x] 1.1 `src/presentation/discord/adapter/serializer.ts`에 `serializeColosseumRolling` 메서드를 추가하여 Giphy 롤링 GIF 및 컵 셰이킹 서스펜스 임베드를 렌더링하고 단위 테스트로 검증
- [x] 1.2 `src/presentation/discord/adapter/serializer.ts`의 `serializeColosseumClash`를 4대 막(R03, R06, R09, R12)에 대응하도록 챕터 타이틀 및 연출 다듬기

## 2. Application Workflow & Orchestration

- [x] 2.1 `src/application/GameWorkflowService.ts`의 `executeColosseumMatchLogic`를 4대 막의 [롤링 서스펜스(3.0s) ➔ 득점 적중(3.5s)] 2단계 순차 루프로 개편하고 단위 테스트로 검증
- [x] 2.2 `src/application/colosseumWorkflow.test.ts`를 업데이트하여 롤링 및 격돌 편집 횟수(총 9회) 검증

## 3. Verification & Deployment

- [x] 3.1 Vitest 및 Pytest 전체 테스트 스위트 100% 통과 검증 (`npm test`, `pytest`)
- [x] 3.2 Cloudflare Worker 재배포 (`wrangler deploy`)
