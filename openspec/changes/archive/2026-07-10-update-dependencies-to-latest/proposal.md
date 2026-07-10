## Why

이 프로젝트는 현재 구버전의 TypeScript(5.4.5) 및 Effect.ts 라이브러리를 사용하고 있어 최신 에코시스템의 성능 개선, 새로운 문법 지원 및 버그 수정을 반영하지 못하고 있습니다. 특히 TypeScript 7.0을 포함하여 모든 라이브러리를 npm의 최신 안정 버전으로 업데이트하여 개발 효율성과 타입 안전성을 극대화합니다.

## What Changes

- **의존성 업데이트**: `package.json`의 모든 주요 및 개발 의존성 패키지를 npm 최신 버전으로 업그레이드합니다.
  - `typescript`: 5.4.5 -> 7.0.2 (**BREAKING** - TypeScript 7.0의 엄격해진 타입 체크 및 최신 문법 지원으로 인한 컴파일 에러 대응 필요)
  - `@effect/platform`: 0.57.0 -> 0.96.2
  - `@effect/schema`: 0.68.0 -> 0.75.5
  - `effect`: 3.5.0 -> 3.21.4
  - `@types/node`: 20.12.12 -> 26.1.1
  - `tsx`: 4.11.0 -> 4.23.0
- **환경 설정 업데이트**: TypeScript 7.0 및 최신 Effect.ts 사양에 맞추어 `tsconfig.json` 및 빌드 설정을 조율합니다.
- **코드 컴파일 수정**: 패키지 버전 업그레이드 과정에서 변경된 API나 컴파일 에러가 발생하는 비즈니스 로직 및 테스트 코드를 수정합니다.

## Capabilities

### New Capabilities

*없음*

### Modified Capabilities

- `project-infra-setup`: TypeScript 7.0 및 최신 의존성 라이브러리가 도입됨에 따라 프로젝트 빌드 및 의존성 구성 요구사항을 수정합니다.

## Impact

- **프로젝트 빌드**: `tsc` 컴파일 시 TypeScript 7.0 컴파일러를 사용하게 되므로, 타입 검사가 더 엄격해질 수 있어 기존 코드의 빌드 확인이 필수적입니다.
- **Effect.ts API**: `effect`, `@effect/platform`, `@effect/schema`의 API 브레이킹 체인지가 있을 수 있으며, 해당 API를 사용하는 소스 코드 및 테스트 코드에 영향이 갑니다.
