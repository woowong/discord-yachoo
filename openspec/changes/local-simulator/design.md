## Context

현재 Yacht Dice 게임의 핵심 도메인 로직(`src/domain/game.ts`, `src/domain/score.ts`)은 순수 함수와 Effect.ts 기반으로 구현되어 있습니다. 하지만 디스코드 봇(Webhook 방식)이나 실제 데이터베이스(Cloudflare D1)를 붙이기 전에, 로컬 터미널 환경에서 게임 흐름을 완전히 시뮬레이션하고 테스트할 수 있는 실행 환경이 필요합니다. 

이 설계는 `AGENTS.md`에 명시된 아키텍처 원칙에 따라 사이드 이펙트와 외부 의존성(Readline, Output 렌더링, 인메모리 저장소)을 Effect Layer로 추상화하여 주입하는 방식을 정의합니다.

## Goals / Non-Goals

**Goals:**
* 터미널 환경에서 비동기 입출력을 안전하게 받아 처리하는 게임 루프 구현
* 게임 스코어보드, 주사위 상태, 커맨드 입력을 한눈에 볼 수 있는 가독성 높은 CLI 뷰 제공
* 단일 플레이어(single) 및 2인 플레이어(multi) 게임 모드 전격 지원
* 도메인 엔진의 어떠한 핵심 비즈니스 로직도 오염시키지 않는 클린 아키텍처 설계

**Non-Goals:**
* 실제 Discord API 연동 및 D1 데이터베이스 적용 (이는 다른 OpenSpec 변경에서 다룸)
* 화려한 GUI나 웹 브라우저 기반 화면 구현
* 게임 상태를 로컬 파일에 지속적으로 저장하는 복잡한 저장 장치 구현

## Decisions

### Decision 1: Effect.ts Layer를 이용한 인프라스트럭처 추상화
로컬 시뮬레이터와 추후 구현될 디스코드 연동체가 동일한 도메인 엔진 위에서 동작할 수 있도록 입출력, 렌더링, 영속성을 Layer로 추상화합니다.
* **`Terminal` 서비스**: Node.js의 `readline` 모듈을 wrapping하여 안전한 CLI 입력(`readline`) 및 출력(`writeLine`)을 제공합니다.
* **`ConsolePresenter` 서비스**: `GameState`를 텍스트 아트로 가공해 화면에 그립니다.
* **`GameRepository` 서비스**: 인메모리 맵을 통해 임시로 게임 세션을 저장하고 불러옵니다.
* *Alternative Considered*: 하나의 모놀리식 파일에 readline과 게임 로직을 섞는 방식. 구현은 빠르지만 계층 분리 원칙을 위배하고 디스코드 연동 시 코드를 재사용할 수 없게 되므로 기각했습니다.

### Decision 2: Node.js Readline API의 Effect화
터미널 입력을 제어할 때 발생하는 비동기 흐름과 중단(Cancellation) 가능성을 안전하게 처리하기 위해, Node.js의 기본 `readline` 인터페이스를 Effect API로 래핑하여 에러가 안전하게 도출되도록 구현합니다.
* *Alternative Considered*: 동기식 CLI 라이브러리(e.g., `readline-sync`)나 무거운 라이브러리(`Inquirer.js`) 도입. 의존성 패키지 수를 최소화하고 순수 Effect 라이프사이클에 맞추기 위해 Node.js 기본 모듈을 Effect로 직접 래핑하기로 결정했습니다.

### Decision 3: 인메모리 영속성 구현 (`InMemoryRepository`)
시뮬레이터 진행 중 단기 세션의 상태 조회를 모사하기 위해 `src/persistence/memory/` 하위에 `InMemoryRepository`를 구현합니다.
* *Alternative Considered*: 로컬 파일(JSON)로 저장하는 방식. 파일 I/O 에러 처리나 권한 처리에 따른 복잡성이 따르며, 일회성 CLI 시뮬레이션 목적에는 굳이 파일 저장까지 필요 없으므로 인메모리 `Map` 구조로 충분하다고 판단했습니다.

### Decision 4: 2열 정렬 스코어보드 렌더러 설계
멀티플레이어 모드를 지원할 수 있도록, 콘솔 출력 시 플레이어 1과 플레이어 2의 점수판을 좌우(2열)로 배치하여 비교하기 쉽도록 정렬해서 렌더링합니다. 또한 가시성을 해치지 않도록 주사위 눈은 일반 아라비아 숫자 텍스트를 사용합니다.

### Decision 5: 예상 점수(Expected Score) 기능 동적 계산
점수를 기록할 카테고리를 고를 때, 사용자가 올바른 전략을 취할 수 있도록 사용 가능한 각 카테고리 기입 시 얻을 수 있는 예상 점수를 실시간으로 계산하여 목록 옆에 가이드로 표시합니다. 이 계산은 도메인 로직에 존재하는 `calculateScore` 함수를 UI 출력 시점에 동적으로 맵핑하여 처리합니다.

## Risks / Trade-offs

* **[Risk] Node.js Readline의 블로킹 동작** → **[Mitigation]** 입력을 대기하는 비동기 처리를 `Effect.tryPromise` 또는 `Effect.async`를 사용하여 감쌈으로써 Effect 파이프라인이 블로킹되지 않도록 구성합니다.
* **[Risk] 콘솔 렌더링의 화면 번쩍임(Flicker) 현상** → **[Mitigation]** 매번 새로운 화면을 출력할 때 ANSI Escape Code(`\x1Bc` 또는 `console.clear()`)를 사용해 화면을 깔끔하게 지우고 새로 그려 완성도 높은 텍스트 뷰를 유지합니다.
