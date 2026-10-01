## 1. SNN Persona & Duel Endpoint (Python)

- [x] 1.1 `experiments/flywire-poc/src/`에 4종 페르소나(Jackpot, Newton, Speeder, Chimera) 정의 및 도파민 지수/상황 대사 생성 로직을 추가하고 단위 테스트로 검증
- [x] 1.2 `experiments/flywire-poc/src/web_server.py`에 `POST /api/fly/duel` 엔드포인트를 추가하여 12라운드 대전 결과 및 타임라인 JSON 반환을 구현하고 curl 테스트로 검증

## 2. D1 Database Schema & Persistence Layer

- [x] 2.1 `migrations/0011_add_colosseum_tables.sql`을 작성하여 `colosseum_matches` 및 `colosseum_bets` 테이블을 정의하고 로컬 D1 마이그레이션 실행 검증
- [x] 2.2 `src/persistence/`에 `ColosseumRepository` 인터페이스 및 D1 구현체를 Effect.ts 스타일로 구현하고 Vitest 단위 테스트로 검증

## 3. Domain & Application Workflow Service

- [x] 3.1 `src/domain/colosseum.ts`에 배당률 계산, 파산 방지 유효성 검사, 승패 판정 및 배당금 분배 순수 도메인 함수를 구현하고 Vitest 단위 테스트로 검증
- [x] 3.2 `src/application/GameWorkflowService.ts`에 `createColosseumMatch`, `placeColosseumBet`, `executeColosseumMatch` 메서드를 구현하고 비동기 오케스트레이션 로직 검증

## 4. Presentation & Discord Slash Command

- [x] 4.1 `src/presentation/discord/adapter/serializer.ts`에 콜로세움 4단계 임베드(베팅 공고, 전반전 격돌, 후반전 클라이맥스, 최종 정산) 직렬화 메서드를 구현하고 단위 테스트로 검증
- [x] 4.2 `src/presentation/discord/handlers/`에 `/colosseum` 명령어 및 베팅 버튼(`colosseum_bet:*`) 인터랙션 핸들러를 추가하고 라우터 연동 검증
- [x] 4.3 `scripts/register-commands.ts`에 `/colosseum` 슬래시 명령어 스펙을 등록하고 스크립트 실행 검증

## 5. End-to-End Verification

- [x] 5.1 전체 프로젝트 단위 테스트(`npm test`)를 실행하여 모든 기존 및 신규 테스트가 100% 통과하는지 검증
- [x] 5.2 모의 콜로세움 매칭 및 베팅 ➔ 시뮬레이션 ➔ ELO 정산 라이프사이클 통합 검증
