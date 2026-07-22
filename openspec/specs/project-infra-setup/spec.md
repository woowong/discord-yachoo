# project-infra-setup Specification

## Purpose
Effect.ts, Cloudflare Workers, D1 데이터베이스, Vitest 등 프로젝트의 기반 의존성 및 인프라 설정을 정의하고 검증한다.
## Requirements
### Requirement: Project Dependencies Setup
프로젝트는 `package.json` 파일에 최신 버전의 Effect.ts 에코시스템(`effect`, `@effect/platform`, `@effect/schema`), Cloudflare Workers 환경(`wrangler`), 개발 및 테스트 환경(`typescript` 7.0.x 이상, `vitest`)을 의존성으로 정의하고 성공적으로 로드해야 한다. (SHALL)

#### Scenario: Dependency Verification
- **WHEN** 개발자가 `npm install`을 실행하여 패키지를 로컬 환경에 설치할 때
- **THEN** 모든 의존성 패키지들이 충돌 없이 정상적으로 설치되고 로드되어야 한다.

### Requirement: TypeScript Configuration for Effect.ts
프로젝트는 TypeScript 7.0 제너레이터 및 안전한 타입 분석을 지원할 수 있도록 `tsconfig.json` 설정을 완비해야 한다. (SHALL)

#### Scenario: Compilation of TS Files
- **WHEN** TypeScript 컴파일러(`tsc`)가 실행될 때
- **THEN** `src/` 디렉토리 내의 TypeScript 파일들이 문법 및 타입 에러 없이 성공적으로 컴파일되어야 한다.

### Requirement: Cloudflare Workers wrangler.toml Setup
프로젝트는 Cloudflare Workers 환경에 빌드 및 배포될 수 있도록 `wrangler.toml` 설정을 가지고 있어야 한다. 특히, 프로덕션 환경 배포를 위한 원격 Cloudflare D1 데이터베이스 바인딩(`DB`)과 `DISCORD_PUBLIC_KEY` 보안 키 연동 설정을 완비해야 한다. (SHALL)

#### Scenario: Wrangler Configuration Validation
- **WHEN** wrangler 개발 서버나 설정 검증 도구 또는 배포 명령이 실행될 때
- **THEN** `wrangler.toml` 설정 파일이 올바르게 분석되어 원격 D1 DB 바인딩이 연결되고 에러가 발생하지 않아야 한다.

### Requirement: Vitest Test Runner Config
프로젝트는 비즈니스 로직과 기타 구현 계층의 단위 테스트를 병렬로 빠르게 수행할 수 있도록 Vitest 설정을 포함해야 한다. (SHALL)

#### Scenario: Run Vitest with Configuration
- **WHEN** `npm run test` 또는 `npx vitest run` 명령어를 실행할 때
- **THEN** Vitest 테스트 러너가 에러 없이 작동하고 작성된 테스트가 통과되어야 한다.

### Requirement: Modular Directory Layout
프로젝트는 아키텍처 규칙(AGENTS.md)에 따라 계층 간의 철저한 격리를 실현하는 폴더 구조(`src/domain`, `src/persistence`, `src/presentation`)를 유지해야 한다. (SHALL)

#### Scenario: Folder Integrity Check
- **WHEN** 프로젝트 루트 내의 소스 경로를 검증할 때
- **THEN** `src/` 하위에 각각 `domain/`(순수 도메인 로직), `persistence/`(전적 및 영속성 보관 계층), `presentation/`(디스코드 웹훅 및 콘솔 레이어) 디렉토리가 생성되어 존재해야 한다.

