## Context

이 프로젝트는 Discord 봇을 Cloudflare Workers 환경 위에 Effect.ts 에코시스템을 사용하여 서빙하고 있습니다.
TypeScript 5.x 버전에서 7.0 버전으로의 대규모 업그레이드와, `effect` 라이브러리의 최신 마이너 버전 업데이트는 빌드 도구와의 호환성 및 API 타입 시그니처 변경에 따른 잠재적 브레이킹 체인지를 유발할 수 있습니다.
안정적인 작동과 최신 패키지 도입을 위해 체계적인 업그레이드 및 오류 검증 절차가 필요합니다.

## Goals / Non-Goals

**Goals:**
- `package.json`에 명시된 모든 의존성을 최신 안정 버전(TypeScript 7.0.2, Effect 3.21.4 등)으로 업그레이드합니다.
- TypeScript 컴파일러(`tsc`)를 통한 전체 프로젝트 컴파일 빌드에 오류가 없도록 만듭니다.
- 단위 테스트(`npm run test` / `vitest`)가 정상적으로 동작하며 모두 통과해야 합니다.
- 로컬 시뮬레이터(`npm run simulate`) 및 Wrangler 개발 환경(`npm run dev`)이 정상 작동해야 합니다.

**Non-Goals:**
- 신규 비즈니스 로직 기능 추가 또는 기존 구현의 아키텍처 재설계.
- 데이터베이스 마이그레이션(D1 DB 스키마 수정 없음).

## Decisions

### 1. 패키지 업데이트 방식
- **결정**: `npm install <package>@latest` 방식을 사용하여 수동으로 호환성을 맞춰가며 버전을 갱신합니다. 일괄적으로 `ncu` 등으로 강제 업데이트 시, 타입 충돌 지점을 추적하기 어려울 수 있으므로 주요 모듈인 `typescript`, `effect`, `@effect/platform`, `@effect/schema` 순서로 업데이트를 수행합니다.
- **대안**: `ncu -u` 후 `npm install`. 이 방식은 한번에 많은 에러가 발생하여 의존성 충돌 해결의 실마리를 찾기 힘들어질 우려가 있어 단계적 업그레이드를 채택합니다.

### 2. TypeScript 7.0 컴파일 에러 대응
- **결정**: TypeScript 7.0에서 강화된 strict 모드 및 타입 선언 대응을 위해 컴파일 실패 지점의 코드를 Effect.ts 모범 사례 및 안전한 타입 선언으로 개수합니다. 필요 시 타입 캐스팅이나 가드 절을 활용하되, `any` 사용은 최대한 지양합니다.

### 3. Effect.ts 에코시스템 동반 업그레이드
- **결정**: TypeScript 7.0은 최신 `effect` 버전의 타입들과 긴밀하게 동작합니다. 기존 `effect` 3.5.x 버전이 아닌 최신 3.21.x 버전으로의 동기적 마이그레이션을 수행하여, 라이브러리 내부 타입 충돌을 최소화합니다.

## Risks / Trade-offs

- **[Risk] TypeScript 7.0.x 버전과 Wrangler/Workerd(Cloudflare Workers 런타임) 빌드 툴체인 간 호환성 이슈**
  - *Mitigation*: 최신 버전 `wrangler` (4.110.0) 및 `tsx` (4.23.0) 역시 최신 TypeScript 버전을 폭넓게 지원하므로 동시 업그레이드를 통해 해결합니다.
- **[Risk] Effect.ts 3.21.x 업그레이드로 인한 API/타입 시그니처 깨짐**
  - *Mitigation*: Effect의 컴파일 에러 메시지를 추적하여, 타입 변환(`Effect.gen`, `Effect.try`, `Schema`)을 Effect 3.x 가이드라인에 부합하게 수정합니다.
