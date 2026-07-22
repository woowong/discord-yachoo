## Why

오늘 구현된 두 주요 게임 기능 업데이트(5분 시한 초대전 및 오픈 매치메이킹 큐, 2단계 항복 제안 시스템, 주사위 UI 정렬 및 웹 대시보드 리플레이 점수 차이 열)에 맞춰 프로젝트의 전체 사용자 문서(`README.ko.md`, `README.md`, `FAQ.ko.md`, `FAQ.md`)를 전면 최신화합니다. 또한, 이번 패치 내역을 지정된 디스코드 채널로 봇 토큰 기반 REST API를 통해 직접 발송할 수 있는 공지 전용 CLI 스크립트를 작성합니다.

## What Changes

- **README.ko.md 및 README.md 전면 최신화**:
  - 주요 특징(Key Features) 섹션에 5분 제한 초대전, 오픈 매치메이킹 (`/yachoo match`), 2단계 항복 제안(Surrender Offer Flow), 웹 대시보드 스코어 차이 열(Score Diff) 반영.
  - 슬래시 명령어 섹션에 `/yachoo match` 및 `/yachoo challenge`의 세부 동작 파라미터 최신화.
- **FAQ.ko.md 및 FAQ.md 전면 최신화**:
  - 기존 Q&A 중 기권(항복) 동작 방식을 단일 항복에서 2단계 수락/거절 제안 방식으로 비교 및 수정.
  - 슬래시 명령어 목록에 `/match` 추가 및 5분 초대전 만료 조건, 오픈 매치메이킹 큐 동작 FAQ 신규 작성.
  - 웹 대시보드 FAQ에 매치 리플레이 스코어 차이(Score Diff) 열 항목 반영.
- **디스코드 공지 발송 CLI 스크립트 구축 (`scripts/send-announcement.ts`)**:
  - `DISCORD_TOKEN` 환경변수와 채널 ID를 입력받아 디스코드 REST API (`POST /channels/{channel_id}/messages`)로 패치 노트 임베드/메시지를 발송하는 스크립트 추가.
  - dry-run 및 실제 전송 모드 지원.

## Capabilities

### New Capabilities
- `patch-announcer`: 디스코드 봇 토큰 기반의 패치 노트 공지 발송 CLI 스크립트 기능 및 문서화.

### Modified Capabilities
- `game-orchestrator`: 5분 제한 초대전 및 오픈 매치메이킹 큐, 항복 제안 시스템 문서 사양 보안.
- `web-dashboard`: 리플레이 점수 차이(Score Diff) 열 문서 사양 보완.

## Impact

- **문서**: `README.ko.md`, `README.md`, `FAQ.ko.md`, `FAQ.md` 전면 반영.
- **스크립트**: `scripts/send-announcement.ts` 생성.
- **운영 API**: `DISCORD_TOKEN` 환경변수를 활용하여 디스코드 API 전송 검증.
