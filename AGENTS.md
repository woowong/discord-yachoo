# Project Rules & Agent Guidelines (AGENTS.md)

이 문서는 이 프로젝트를 개발할 때 에이전트(AI)와 개발자가 공통적으로 준수해야 하는 핵심 아키텍처 원칙과 작업 규칙입니다.

---

## 1. 아키텍처 원칙 (Architecture Principles)

* **계층 간의 철저한 격리**:
  * **Core Game Engine (Pure Domain)**: 모든 비즈니스 로직(주사위 계산, 상태 머신 등)은 외부 의존성(Discord API, DB, FS)이 없는 **순수 함수(Pure Functions)**로만 작성합니다.
  * **Presentation Layer**: `GameState`를 디바이스/플랫폼에 맞게 렌더링하며, 로컬 Console View와 Discord View가 인터페이스 수준에서 호환되도록 설계합니다.
  * **Persistence Layer**: 데이터 저장소 구현은 Repository 인터페이스 뒤로 캡슐화합니다.
* **Effect.ts 활용**:
  * 의존성 주입, 에러 핸들링, 사이드 이펙트 제어 등은 `Effect.ts`를 사용합니다.
  * `try-catch`나 `throw` 대신 Effect의 Safe Error handling을 적용하고, `Effect.gen` 제너레이터 문법을 일관되게 사용합니다.

---

## 2. 작업 가이드라인 (Agent Action Guidelines)

1. **로컬 우선 개발**: 외부 인프라(Cloudflare D1, Discord API) 없이 CLI 콘솔 상에서 직접 테스트할 수 있는 **로컬 시뮬레이터**가 항상 작동 가능해야 합니다.
2. **테스트 필수**: 모든 도메인 로직은 Unit Test(`vitest` 등)로 100% 검증될 수 있는 구조를 취합니다.
3. **상태 관리**: 진행 중인 게임 세션 상태는 D1 데이터베이스 또는 KV에 임시 보관합니다.
4. **OpenSpec 연동**:
   * 구현은 항상 명확한 사양서(`specs/**/*.md`)를 먼저 정의하거나 동기화한 다음 진행합니다.
   * 작업은 `openspec new change <change-name>` 명령어를 통해 브랜치를 격리하여 점진적으로 수행합니다.

