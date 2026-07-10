## Why

야추 다이스(Yacht Dice)의 규칙을 관리하는 게임 상태 엔진과 주사위 족보 계산기 로직이 필요합니다. 디스코드 API나 데이터베이스 연동 없이 오직 입력값에 의해서만 결정되는 순수 함수형(Pure Functional) 도메인 레이어를 설계함으로써 게임 코어의 안전성을 높이고 독립적인 검증이 가능하도록 합니다.

## What Changes

* 야추 다이스의 모든 카테고리(Aces, Full House, Yacht 등) 점수 산정 로직 구현
* 주사위 홀드(Hold) 상태 관리, 굴리기 횟수 제어, 턴 전환 및 승리 판정을 처리하는 상태 머신 구현
* 1인용 연습 모드 및 2인용 대결 모드 상태 처리를 공통 도메인 타입으로 구현
* Effect.ts 환경과 호환되는 안전한 도메인 타입 설계

## Capabilities

### New Capabilities
- `yacht-score-rules`: 주사위 조합 입력값에 따른 12가지 카테고리별 야추 점수 계산 규칙 정의
- `yacht-state-machine`: 주사위 롤링, 홀드, 카테고리 선택에 따라 불변(Immutable) 상태를 안전하게 갱신해나가는 순수 게임 상태 전이 엔진 정의

### Modified Capabilities
*없음*

## Impact

* `src/domain/` 폴더 하위에 순수한 상태 머신 및 채점 모듈 추가
* 프레젠테이션 계층이나 DB 구현체는 이 도메인 레이어가 제공하는 순수 기능 및 타입에 의존하게 됨
