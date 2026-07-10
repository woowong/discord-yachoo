# Project Rules & Agent Guidelines (AGENTS.md)

이 문서는 이 프로젝트를 개발할 때 에이전트(AI)와 개발자가 공통적으로 준수해야 하는 아키텍처 원칙, 기술 스택 가이드라인, 그리고 코딩 규칙을 명시합니다.

---

## 1. 아키텍처 원칙 (Architecture Principles)

### 1) 계층 간의 철저한 격리 (Layer Separation)
* **Core Game Engine (Pure Domain)**:
  * 주사위 계산, 점수 합산, 야추 게임의 상태 머신 등 모든 비즈니스 로직은 **순수 함수(Pure Functions)**로만 작성합니다.
  * 디스코드 API, HTTP 요청, 데이터베이스 드라이버, 파일 시스템 등 어떠한 사이드 이펙트(Side Effect) 및 외부 의존성도 가지지 않아야 합니다.
* **Presentation Layer**:
  * 게임 엔진의 상태(`GameState`)를 디바이스나 클라이언트 플랫폼에 맞게 렌더링하는 역할만 맡습니다.
  * **로컬 시뮬레이션용 Console View**와 **디스코드 채널용 Discord View**가 인터페이스 수준에서 호환될 수 있도록 추상화합니다.
* **Persistence Layer**:
  * 플레이어 전적 및 게임 상태 저장을 담당합니다.
  * 데이터 저장소(In-memory, Cloudflare D1 등)의 세부 구현은 레포지토리 인터페이스 뒤로 캡슐화합니다.

### 2) Functional Programming (Effect.ts)
* 이 프로젝트는 **TypeScript**와 **Effect.ts** 에코시스템을 기반으로 합니다.
* 사이드 이펙트 제어, 의존성 주입(Dependency Injection), 에러 핸들링, 환경설정 관리 등은 Effect의 `Effect`, `Layer`, `Context`를 활용하여 함수형으로 처리합니다.
* 로컬 테스트 시에는 `MemoryRepository`와 `ConsolePresenter`를 주입하고, 서버리스 배포 시에는 `D1Repository`와 `DiscordPresenter`를 주입할 수 있도록 유연한 아키텍처를 유지합니다.

---

## 2. 인프라 및 실행 환경 (Infrastructure & Runtime)

### 1) Cloudflare Workers (Serverless Webhook)
* 디스코드 봇은 상시 소켓 연결(Gateway) 방식이 아닌, Discord가 전송하는 **Interactions Webhook HTTP POST** 요청을 수신하는 방식으로 빌드합니다.
* 이를 통해 Cloudflare Worker의 Serverless 무료 요금제 범위 내에서 비용 없이 지속해서 구동할 수 있도록 합니다.

### 2) Cloudflare D1 (Database)
* 영속성 데이터는 SQLite 기반의 서버리스 데이터베이스인 **Cloudflare D1**을 사용하여 무료 등급 내에서 전적과 설정을 관리합니다.

---

## 3. 테스트 및 로컬 시뮬레이션 (Local Simulation & Testing)

* 외부 인프라(Cloudflare D1, Discord API) 없이도 CLI 콘솔 상에서 직접 주사위를 굴리고 1인/2인 플레이를 진행할 수 있는 **로컬 시뮬레이터**가 항상 작동 가능해야 합니다.
* 모든 도메인 로직은 Unit Test(`vitest` 등)로 100% 검증될 수 있는 구조를 취합니다.

---

## 4. 작업 가이드라인 (Agent Action Guidelines)

1. **상태 관리**: 진행 중인 1인/2인 게임의 단기 세션은 D1 데이터베이스 또는 KV에 임시 상태로 보관합니다.
2. **코드 수정 규칙**: Effect.ts의 네이티브 파이프라인이나 제너레이터 문법(`Effect.gen`)을 일관되게 사용하고, `try-catch`나 `throw` 대신 Effect의 Safe Error handling을 최우선으로 적용합니다.
3. **OpenSpec 연동**:
   * 구현은 항상 명확한 사양서(`specs/**/*.md`)를 먼저 정의하거나 동기화한 다음 진행합니다.
   * 작업은 `openspec new change <change-name>` 명령어를 통해 브랜치를 격리하여 점진적으로 수행합니다.
