# Spec Delta

## MODIFIED Requirements

### Requirement: Project Dependencies Setup
프로젝트는 `package.json` 파일에 최신 버전의 Effect.ts 에코시스템(`effect`, `@effect/platform`, `@effect/schema`), Cloudflare CLI 환경(`cf`), 개발 및 테스트 환경(`typescript` 7.0.x 이상, `vitest`)을 의존성으로 정의하고 성공적으로 로드해야 한다. (SHALL)

#### Scenario: Dependency Verification
- **WHEN** 개발자가 `npm install`을 실행하여 패키지를 로컬 환경에 설치할 때
- **THEN** 모든 의존성 패키지들이 충돌 없이 정상적으로 설치되고 로드되어야 한다.

### Requirement: Cloudflare Workers wrangler.toml Setup
프로젝트는 Cloudflare Workers 환경에 빌드 및 배포될 수 있도록 `cloudflare.config.ts` 설정을 가지고 있어야 한다. 특히, 프로덕션 환경 및 스테이징 환경 배포를 위한 원격 Cloudflare D1 데이터베이스 바인딩(`DB`)과 `FLY_BRAIN_URL` 등의 환경 변수 설정을 완비하고, `cf dev` 및 `cf deploy` 명령어로 실행될 수 있어야 한다. (SHALL)

#### Scenario: Wrangler Configuration Validation
- **WHEN** cf 개발 서버(`cf dev`)나 설정 검증 도구 또는 배포 명령(`cf deploy`)이 실행될 때
- **THEN** `cloudflare.config.ts` 설정 파일이 올바르게 분석되어 원격 D1 DB 바인딩이 연결되고 에러가 발생하지 않아야 한다.
