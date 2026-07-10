## Why

디스코드 게임 내에서 플레이어의 누적 전적(승/패/무승부/최고 점수)과 각 매치의 최종 경기 결과를 영구적으로 기록하고 조회하기 위한 영속성 저장소가 필요합니다. Cloudflare Workers 환경에서 무료 티어로 영구적인 데이터를 저장할 수 있도록 SQLite 기반 서버리스 DB인 Cloudflare D1 연동 및 데이터 모델링을 구축합니다.

## What Changes

* 플레이어 승패 통계(`players`) 및 매치 이력(`matches`)을 저장할 SQLite DB 스키마 및 마이그레이션 SQL 스크립트 작성
* Effect.ts의 `Context.Tag`를 사용하여 특정 데이터베이스 모듈에 종속되지 않는 `PlayerRepository` 및 `MatchRepository` 인터페이스 정의
* Cloudflare D1 바인딩 환경 및 로컬 개발용 wrangler D1 local 드라이버를 아우르는 D1 Repository 구현체 개발
* 전적 갱신(승리, 패배, 무승부 추가), 최고 점수 업데이트 및 랭킹보드용 쿼리 구현

## Capabilities

### New Capabilities
- `d1-database-schema`: 플레이어 통계 및 경기 기록 저장을 위한 데이터베이스 스키마 및 마이그레이션 정의
- `persistence-repository`: D1 인프라를 바인딩하여 안전한 읽기/쓰기를 수행하는 Effect.ts 기반 레포지토리 서비스 구현

### Modified Capabilities
*없음*

## Impact

* `src/persistence/d1/` 디렉토리에 D1 레포지토리 구현체 추가
* 프로젝트 루트에 D1 DB 구성을 위한 SQL 파일 및 `wrangler.toml`에 D1 바인딩 설정 추가
