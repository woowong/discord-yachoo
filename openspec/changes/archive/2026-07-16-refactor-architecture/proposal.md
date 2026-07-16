## Why

현재 `src/index.ts` 파일이 HTTP Webhook 요청의 인증/파싱, Discord 커맨드/컴포넌트 라우팅, 게임의 비즈니스 조율, 한국어 놀림/축하 메시지 템플릿 관리 등 너무 많은 역할(SRP 위반)을 가지고 있어 관리가 어렵습니다. 이를 해결하기 위해 기능의 동작 수정 없이 깨끗하고 확장성 있는 구조로 리팩토링을 수행하며, 이 과정에서 기능이 파손되지 않도록 견고한 통합 테스트 스위트(Red-Green-Refactor 기반)를 먼저 확충하고자 합니다.

## What Changes

- **Worker 진입점 경량화**: `src/index.ts`는 시그니처 검증 및 JSON 파싱 등 순수한 Webhook 인입 및 의존성 주입(Layer) 조율만 담당하도록 축소합니다.
- **Interaction Dispatcher 분리**: Discord 커맨드(`/challenge`, `/profile` 등) 및 컴포넌트 이벤트(`roll_`, `hold_` 등)를 개별 모듈로 격리하여 라우팅 복잡도를 해소합니다.
- **Application Layer (`GameWorkflowService`) 신설**: DB 트랜잭션, 백그라운드 태스크 제어, 게임 상태 변경 조율 등 핵심 워크플로우를 담당하는 순수 Effect 서비스 계층을 추가하여 비즈니스 로직을 격리합니다.
- **메시지 리소스 분리**: 놀림(Teasing)/축하 문구 풀 및 멘션 조건 판단 로직을 `src/presentation/messages/` 폴더로 외재화하여 가독성을 개선합니다.
- **통합 테스트 보강 (Red Test First)**: 변경 전 기존의 다양한 유스케이스(기권, 주사위 롤링, 카테고리 선택, 놀림 알림 등)를 재현하는 E2E 성격의 테스트 코드를 [src/index.test.ts](file:///Users/woowong/private/discord-yachoo/src/index.test.ts)에 구축하여, 리팩토링 시 기능 동일성을 철저히 보장합니다.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `game-orchestrator`: `index.ts`에 집중되었던 게임 제어 흐름 및 Discord interaction 처리 구조가 `Dispatcher`와 `Application Service`로 위임되도록 수정됩니다.
- `turn-mention-notification`: 놀림/축하 메시지 풀 및 알림 송신 로직이 `index.ts`에서 별도 메시지 모듈로 분리됩니다.

## Impact

- `src/index.ts`: 코드 크기가 비약적으로 감소하며 Webhook 핸들러 역할만 담당.
- `src/index.test.ts`: 리팩토링 신뢰성을 확보하기 위한 통합 테스트 시나리오 대폭 추가.
- `src/presentation/discord/`: 새로운 라우터 및 커맨드/컴포넌트 핸들러들 추가.
- `src/application/`: 신규 유스케이스 서비스들 추가.
