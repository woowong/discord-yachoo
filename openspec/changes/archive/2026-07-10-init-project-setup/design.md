## Context

이 프로젝트는 디스크립션 기반의 야추 다이스(Yacht Dice) 게임을 Cloudflare Workers(서버리스 웹훅) 환경에 배포하고, 로컬 시뮬레이션 및 테스트가 완벽히 가능하도록 설계하는 새로운 프로젝트입니다. 본 변경 사항(init-project-setup)은 이를 위한 기초 인프라 구성(TypeScript, Effect.ts, Vitest, Wrangler)과 계층형 디렉토리 설정을 진행합니다.

## Goals / Non-Goals

**Goals:**
* TypeScript 컴파일러 설정 및 Effect.ts에 최적화된 엄격한 타입 옵션 수립
* Vitest를 이용한 테스트 인프라 구성
* Cloudflare Workers 배포 환경(`wrangler.toml`) 설정
* 도메인, 영속성, 프레젠테이션 레이어로 명확히 격리된 디렉토리 뼈대 생성

**Non-Goals:**
* 야추 다이스 게임의 핵심 도메인 로직 개발 (2단계 `yacht-core-engine`에서 다룸)
* CLI 로컬 시뮬레이터 실행 로직 구현 (3단계 `local-simulator`에서 다룸)
* 데이터베이스 테이블 설계 및 실제 DB 어댑터 구현 (4단계 `database-d1-persistence`에서 다룸)
* 디스코드 웹훅의 시그니처 및 라우팅 구현 (5~6단계에서 다룸)

## Decisions

### 1. 패키지 및 런타임 환경 설정
* **결정**: npm을 패키지 매니저로 사용하며, ESM(ES Modules)을 타겟으로 TypeScript 프로젝트를 구성한다.
* **이유**: Cloudflare Workers와 Effect.ts 모두 최신 모듈 표준인 ESM 하에서 가장 매끄럽게 컴파일 및 실행되기 때문이다.

### 2. TypeScript 컴파일러 구성 (`tsconfig.json`)
* **결정**: `strict: true`를 활성화하고, `moduleResolution: "bundler"`, `target: "ES2022"`, `module: "ESNext"` 옵션을 지정한다.
* **이유**: Effect.ts의 복잡한 타입 추론이 올바르게 기능하고 안전성을 유지하기 위해 엄격한 타입 검사가 필수적이다. 또한, Wrangler의 내장 esbuild 번들링 스펙과 일치시키기 위함이다.

### 3. Wrangler 설정 (`wrangler.toml`)
* **결정**: 진입점(Main entrypoint)을 `src/index.ts`로 잡고 `compatibility_date`를 최신으로 지정하여 셋업한다.
* **이유**: 로컬 개발과 서버리스 배포의 시작점을 단일화하고 Cloudflare Worker 사양에 맞춘다.

### 4. 테스트 프레임워크 선정
* **결정**: Jest 대신 Vitest를 테스트 러너로 구성한다.
* **이유**: Vitest는 별도의 복잡한 TS 컴파일 연동 없이 ESM과 TypeScript를 모국어로 지원하며 속도가 매우 빠르고 Wrangler 빌드 설정과 연동이 쉽다.

## Risks / Trade-offs

* **[Risk]** 로컬 실행 환경(Node.js)과 Cloudflare Workers 프로덕션 실행 환경의 차이로 인한 런타임 불일치.
  * **[Mitigation]** 순수 게임 로직(Domain Layer)에는 전역 객체(window, global, process 등)나 환경 의존적 코드를 일절 작성하지 않으며, 테스트 도구(Vitest)로 순수 함수 입출력 검증에 집중한다.
