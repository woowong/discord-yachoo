## Why

디스코드 API나 데이터베이스 인프라에 의존하지 않고, 오직 터미널(CLI) 환경에서 입출력을 주고받으며 야추 다이스 1인/2인 게임을 완전히 검증하고 디버깅할 수 있는 로컬 실행기가 필요합니다. Effect.ts의 의존성 주입 구조를 활용하여 실제 연동체 없이 독립적으로 개발 및 테스팅할 수 있는 루프를 구축합니다.

## What Changes

* CLI 환경에서 키보드 입력을 받고 주사위 홀드/리롤/족보 기입 액션을 엔진에 전달하는 이벤트 대화형 루프 구현
* 메모리 상에서 플레이어 정보 및 현재 게임 상태를 보관하는 모의 저장소(`InMemoryRepository`) 구현
* 터미널 창에 게임 스코어보드와 주사위 상태를 텍스트 아트로 가독성 있게 렌더링하는 `ConsolePresenter` 구현
* `npm run simulate` 형태의 명령어로 터미널에서 즉시 게임을 기동할 수 있는 헬퍼 스크립트 작성

## Capabilities

### New Capabilities
- `cli-game-runner`: 터미널 콘솔 입출력을 활용하여 야추 다이스 1인/2인 플레이를 가상 시뮬레이션할 수 있는 대화형 CLI 실행기 구현

### Modified Capabilities
*없음*

## Impact

* `src/presentation/console/` 하위에 콘솔 게임 실행 관련 모듈 추가
* `src/persistence/memory/` 하위에 인메모리 테스트용 임시 레포지토리 구현체 추가
* 의존성 주입 설정을 검증하기 위한 로컬 실행 진입점 코드 구축
