## Why

디스코드 야추 다이스(Yacht Dice) 보드게임 개발을 시작하기 위해 TypeScript, wrangler(Cloudflare Workers CLI), Effect.ts, Vitest 및 기본적인 폴더 구조를 포함한 초기 프로젝트 설정과 인프라 뼈대를 구축하고자 합니다. 이를 통해 이후 계층별 설계(도메인 엔진, 로컬 시뮬레이터, D1 데이터베이스, 디스코드 웹훅)를 효과적으로 구현할 수 있는 기반을 다집니다.

## What Changes

* `package.json` 추가 및 필요한 의존성(`effect`, `@effect/platform`, `@effect/schema`, `wrangler`, `vitest`, `typescript`) 구성
* TypeScript 설정을 위한 `tsconfig.json` 생성 (Effect.ts 호환성 고려)
* Cloudflare Workers 개발 및 배포를 위한 `wrangler.toml` 파일 구성
* 단위 테스트를 위한 `vitest.config.ts` 설정
* 계층형 아키텍처(Pure Domain, Persistence, Presentation) 및 로컬 시뮬레이션을 구현할 디렉토리 레이아웃 구성

## Capabilities

### New Capabilities
- `project-infra-setup`: TypeScript, Effect.ts, Wrangler 및 테스트 러너(Vitest)를 포함한 기본 인프라 구조와 모듈러 계층(Domain, Persistence, Presentation) 디렉토리 구조 설정

### Modified Capabilities
*없음*

## Impact

* 최초의 프로젝트 생성으로 기존 코드에 영향 없음
* 새로운 개발/테스트 의존성 추가
