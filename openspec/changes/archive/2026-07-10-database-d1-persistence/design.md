## Context

디스코드 게임 내에서 플레이어의 누적 전적(승리, 패배, 무승부, 최고 점수)과 각 게임 매치의 최종 결과를 안전하게 기록하고 조회하기 위한 영속성 저장소가 요구됩니다. Cloudflare Workers 환경에 적합하고 무료 티어로 운영 가능한 SQLite 기반의 Cloudflare D1 데이터베이스를 사용하며, Effect.ts를 이용한 구조 설계와 Wrangler의 Local/Production 환경을 모두 지원하도록 설계합니다.

## Goals / Non-Goals

**Goals:**
* D1 데이터베이스 스키마 설계 및 마이그레이션 SQL 작성 (`players` 테이블 및 `matches` 테이블).
* Effect.ts의 `Context.Tag`를 사용한 비즈니스 로직 격리용 `PlayerRepository` 및 `MatchRepository` 인터페이스 설계.
* Cloudflare D1 데이터베이스 바인딩(`D1Database`)을 Effect Layer로 추상화하여 의존성 주입(Dependency Injection) 구현.
* 플레이어 승패 전적 갱신, 최고 점수 업데이트 및 랭킹보드 조회 기능 구현.
* 로컬 테스트를 위해 D1 API 모킹(Mocking) 혹은 테스트용 메모리 데이터베이스 구축 방안 수립.

**Non-Goals:**
* 실시간 게임의 진행 상태(Roll 카운트, 주사위 홀드 여부 등)의 D1 저장 (단기 게임 세션은 인메모리 혹은 KV에서 다루며, 본 작업 범위인 D1 persistence에서는 최종 게임 결과와 플레이어 통계만을 관리함).
* Discord 봇 Webhook UI 자체의 구현.

## Decisions

### 1. D1 Database Schema 설계
SQLite 호환 데이터 형식에 따라 `players`와 `matches` 테이블을 아래와 같이 설계합니다.
* **`players` 테이블**: 디스코드 사용자 ID (`id`)를 기본키로 두고 누적 전적 및 최고 기록을 보관합니다.
* **`matches` 테이블**: 매회 경기 완료 후 생성되는 경기 이력 데이터입니다. 1인용(`single`)과 2인용(`multi`) 게임을 모두 기록할 수 있도록 `player2_id`와 `player2_score`를 NULL 허용 컬럼으로 정의합니다.

### 2. Effect.ts Repository 인터페이스 및 의존성 주입
특정 DB 드라이버에 비즈니스 로직이 강결합되지 않도록, 인터페이스(Context Tag)를 먼저 구성합니다.
* `D1Database` 자체를 Effect의 `Context.GenericTag<D1Database>("D1Database")`로 정의하여 주입받을 수 있게 설계합니다.
* `PlayerRepository`와 `MatchRepository`는 `D1Database` 의존성을 필요로 하는 Effect Layer로 생성합니다.
* 이로써 테스트 환경에서는 모의(Mock) D1 인터페이스나 메모리 DB를 손쉽게 교체할 수 있습니다.

### 3. Safe Error Handling
* D1 쿼리 호출 및 바인딩 실패와 같은 사이드 이펙트는 `Effect.tryPromise`를 사용하여 포착합니다.
* 에러 발생 시 커스텀 클래스인 `RepositoryError`를 반환하도록 감싸주어 안전하게 에러를 전파하거나 처리할 수 있도록 설계합니다.

## Risks / Trade-offs

* **[Risk] Cloudflare D1 Local 개발 환경과 Production 환경의 괴리**
  * *Mitigation*: wrangler dev 환경에서 `--local` 모드로 실행 시, 로컬 SQLite 파일(.wrangler/state/v3/d1)에 마이그레이션이 정상 적용되도록 wrangler.toml 바인딩 설정을 일관되게 맞추고 마이그레이션 명령어를 문서화합니다.
* **[Risk] 동시성 이슈 (두 명 이상의 사용자가 동시에 랭킹을 갱신하는 경우)**
  * *Mitigation*: SQLite의 트랜잭션 또는 단일 쿼리 내 아토믹(Atomic) 연산(`SET wins = wins + 1`)을 사용해 경쟁 조건을 방지합니다.
