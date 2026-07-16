## Context

현재 `src/index.ts`는 Cloudflare Workers 환경에서 Discord Webhook POST 요청을 수신하는 단일 진입점입니다. 하지만 이 파일 하나에 시그니처 검증, JSON 파싱, Interaction 분기 처리, 게임 시작/기권/카테고리 지정 등의 워크플로우 통제, ELO/통계 업데이트 데이터베이스 조율, 한국어 놀림 멘트 하드코딩 등 너무 많은 책임이 강결합되어 있습니다. 이로 인해 가독성이 낮고 유지보수가 매우 어려우며, 테스트 코드를 독립적으로 확장하기 힘든 구조입니다.

이를 프로젝트 아키텍처 원칙(Clean Architecture 및 `Effect.ts`를 활용한 함수형 프로그래밍)에 맞게 리팩토링하고, 리팩토링 전후의 기능이 완벽히 동일하게 동작함을 보장하기 위한 안전한 테스트 기반 설계를 제안합니다.

## Goals / Non-Goals

**Goals:**
- **통합 테스트 강화 (Red Test First)**: 변경 적용 전, Webhook 진입점을 대상으로 전체 게임 플레이 시나리오(인증 실패, 챌린지 생성, 주사위 롤링/홀드, 카테고리 기입, 기권, 통계 업데이트 등)를 모의 검증하는 통합 테스트 스위트([src/index.test.ts](file:///Users/woowong/private/discord-yachoo/src/index.test.ts))를 확충하여 리팩토링 신뢰성을 100% 보장합니다.
- **단일 책임 원칙(SRP) 적용**: `index.ts`를 Webhook 인증/인입 기능으로 한정하고, 라우팅(Dispatcher), 비즈니스 조율(Application Service), 메시지 템플릿(Messages Module)으로 책임을 철저히 분리합니다.
- **선언적 사이드 이펙트 제어**: 데이터베이스 저장, Discord API 전송, 백그라운드 태스크 제어를 `Effect.ts` 제너레이터 문법(`Effect.gen`)과 레이어 의존성 주입(`Layer`)을 이용해 선언적으로 처리합니다.

**Non-Goals:**
- 게임 상태 머신 및 점수 계산 규칙 등 도메인(Pure Domain) 로직은 리팩토링 대상에서 제외하며, 동작의 변화를 주지 않습니다.
- 데이터베이스(D1) 스키마 변경이나 Discord API 호출 사양을 수정하지 않습니다.

## Decisions

### Decision 1: 통합 테스트 스위트 보강 및 Red Test First 접근
- **결정**: 리팩토링 코드를 작성하기 전에, 기존 `index.ts`에 대한 Webhook Level 통합 테스트를 [src/index.test.ts](file:///Users/woowong/private/discord-yachoo/src/index.test.ts)에 구축합니다.
- **Rationale**: 리팩토링 후의 인터페이스와 응답이 기존과 동일함을 기계적으로 확인하기 위함입니다. 이를 통해 먼저 깨지는(혹은 동일성을 증명하는) 테스트 세트를 확보한 후 리팩토링을 점진적으로 적용하여 Green으로 유지합니다.

### Decision 2: Application Layer (`GameWorkflowService`) 신설
- **결정**: 비즈니스 흐름을 조율하는 `GameWorkflowService`를 `src/application/GameWorkflowService.ts`에 정의하고 Effect 서비스 태그로 등록합니다.
- **Rationale**: 기존에 `index.ts`와 콘솔 `runner.ts`에서 각자 처리하던 DB 조회/저장, 승패 판단, ELO 갱신 등의 비즈니스 워크플로우를 하나로 묶어 중복을 줄이고 핵심 정책을 캡슐화합니다.
- **구조**:
  ```typescript
  export interface GameWorkflowService {
    readonly challenge: (challengerId: string, opponentId?: string, guildId: string, channelId: string) => Effect.Effect<GameState, ActiveGameExistsError | PlayerNotFoundError, GameRepository | PlayerRepository>;
    readonly roll: (gameId: string, playerId: string, holds: DiceHold) => Effect.Effect<GameState, InvalidTurnError | GameNotFoundError, GameRepository>;
    readonly selectCategory: (gameId: string, playerId: string, category: ScoreCategory, guildId: string, channelId: string, ctx: ExecutionContext) => Effect.Effect<GameState, ...>;
    readonly surrender: (gameId: string, playerId: string, guildId: string, channelId: string, ctx: ExecutionContext) => Effect.Effect<GameState, ...>;
  }
  ```

### Decision 3: Command & Component Dispatcher 도입
- **결정**: `src/presentation/discord/router.ts`를 신설하고 커맨드와 컴포넌트 핸들러를 매핑 및 파싱하는 경량 라우터를 도입합니다.
- **Rationale**: `index.ts` 내부의 복잡한 중첩 `if-else` 분기를 분리하여 가독성을 극대화합니다. 개별 커맨드(`/challenge`, `/profile` 등)는 독립 모듈 파일로 격리하여 테스트 및 관리가 쉽도록 합니다.

### Decision 4: 한국어 놀림 멘트 및 메시지 리소스 외재화
- **결정**: [src/index.ts](file:///Users/woowong/private/discord-yachoo/src/index.ts) 최상단에 하드코딩되어 있던 메시지 풀들과 관련 놀림 메시지 판단 로직을 `src/presentation/messages/ko.ts`로 격리하고 i18n 서비스 또는 메시지 빌더 인터페이스로 분리합니다.
- **Rationale**: 멘트 교체 및 다국어 지원에 용이하도록 메시지 선언과 런타임 비즈니스 흐름을 물리적으로 격리합니다.

## Risks / Trade-offs

- **Cloudflare Workers 백그라운드 태스크 제어 (`ctx.waitUntil`)**:
  - *Risk*: `Effect.runPromise`를 통해 비동기 백그라운드 태스크(메시지 삭제, 애니메이션 패치 등)를 Worker 컨텍스트에서 실행할 때, `ExecutionContext`가 유실되면 프로세스가 즉시 종료되어 백그라운드 작업이 소실될 위험이 있습니다.
  - *Mitigation*: Application Service의 메서드 시그니처나 Effect Context에 `ExecutionContext`를 전달할 수 있도록 구성하여, 백그라운드 예약 작업 실행 시 안정성을 담보합니다.
- **레이어 의존성 주입(`Layer`) 복잡도 증가**:
  - *Risk*: 서비스 계층이 세분화됨에 따라 `index.ts`에서 Layer를 제공(provide)하고 병합(merge)하는 코드의 의존성 구조가 복잡해질 수 있습니다.
  - *Mitigation*: 통합 테스트 실행 시 `Layer.provide` 오류를 정적 타입 검사 및 Vitest 실행 시점에 잡아낼 수 있도록 Mock 레이어 주입 체계를 함께 설계합니다.
