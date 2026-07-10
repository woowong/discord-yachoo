## Why

앞서 개별적으로 작성한 게임 상태 엔진, D1 데이터베이스 저장소, 디스코드 웹훅 규격을 하나로 연결하여 디스코드 채팅방에서 실제로 1인/2인 야추 다이스 게임을 플레이하고 전적을 보관하는 통합 애플리케이션 코디네이터와 런타임이 필요합니다. Effect.ts로 환경을 결합하고 Cloudflare Workers 배포 엔트리포인트를 구성합니다.

## What Changes

* Cloudflare Workers의 `fetch` 핸들러 진입점(`src/index.ts`)을 구현하여 웹훅 서명 검증 및 라우터 구동
* 진행 중인 게임 세션 상태(Active Game State)의 라이프사이클 관리 (KV 또는 D1 데이터베이스 임시 저장을 통해 서버리스 비상태성 대응)
* `/challenge`, `/profile`, `/leaderboard` 명령어 실행에 따른 비즈니스 서비스 유스케이스 구현
* 디스코드 API 서버에 봇 명령어 목록을 원격 등록하기 위한 커맨드 등록 스크립트(`scripts/register-commands.ts`) 추가
* 로컬 터미널 시뮬레이터와 디스코드 실 운영용 라이브러리의 최종 의존성 주입(Dependency Injection) 구성 완료

## Capabilities

### New Capabilities
- `game-orchestrator`: 디스코드 웹훅 핸들러, 게임 엔진, DB 저장소를 Effect.ts 서비스 레이어로 통합 결합하여 실시간 게임 플레이 루프를 조율하는 오케스트레이션 엔진 구축
- `discord-slash-command-registrar`: 디스코드 서버가 봇의 슬래시 명령어들을 감지할 수 있도록 디스코드 API에 스키마를 동기화하는 명령어 등록 기능 구축

### Modified Capabilities
*없음*

## Impact

* `src/index.ts` 파일이 단순 플레이스홀더에서 실제 Worker 진입점으로 수정되며, 전체 프로젝트 빌드 및 배포 구성이 완비됩니다.
* 실 배포 시 디스코드 개발자 포털의 웹훅 설정과 연동하여 라이브 서비스 기동이 가능해집니다.
