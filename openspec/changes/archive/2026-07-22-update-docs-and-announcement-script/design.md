## Context

프로젝트 `discord-yachoo`는 최근 5분 제한 지목 초대전, 오픈 매치메이킹 큐(`yachoo match`), 2단계 항복 제안 흐름(Surrender Offer), 그리고 웹 대시보드의 점수 차이(Score Diff) 리플레이 열 추가 등 핵심 도메인 및 프레젠테이션 레이어의 기능 추가가 이루어졌습니다.
그러나 사용자 레벨에서 접근하는 레포지토리 메인 문서(`README.ko.md`, `README.md`, `FAQ.ko.md`, `FAQ.md`)에는 과거의 사양(단일 포기 항복, 단일 대전 등)이 기재되어 있거나 신규 명령어가 누락되어 있는 상태입니다.
또한, 이러한 변경사항을 디스코드 서버의 특정 공지 채널로 유저들에게 전달하기 위해 `DISCORD_TOKEN` 환경 변수와 디스코드 REST API (`POST /channels/{channel_id}/messages`)를 사용하는 공지 발송 전용 스크립트(`scripts/send-announcement.ts`)가 필요합니다.

## Goals / Non-Goals

**Goals:**
1. 프로젝트의 전반적인 문서(`README.ko.md`, `README.md`, `FAQ.ko.md`, `FAQ.md`)를 기존 사양과 철저히 비교하여 모순점(항복 수락/거절 플로우, 5분 초대전 유효기간 등)을 모두 최신화 및 보완.
2. 디스코드 채널로 패치 노트를 자동 게시할 수 있는 독립형 공지 발송 스크립트 (`scripts/send-announcement.ts`) 구현.
3. 스크립트 실행 시 채널 ID 및 `DISCORD_TOKEN` 검증, 사전 확인(dry-run 모드) 및 안전한 에러 핸들링 구축.
4. package.json에 `npm run announce` 스크립트 등록.

**Non-Goals:**
- Discord Bot Webhook 서버 내부에 관리자 전용 웹훅 명령어(`/announce`)를 탑재하지 않음 (보안 및 권한 관리를 위해 CLI 스크립트로 격리).
- 기존 게임 도메인 로직이나 DB 마이그레이션 코드를 재수정하지 않음.

## Decisions

1. **문서 수정 방식**: 단순 텍스트 덧붙이기 대신 기존 문서 내 outdated된 기술(예: "즉시 기권", "1v1 도전시 즉시 생성")을 파악하여 2단계 항복 제안 프로세스 및 5분 만료 로직으로 문맥을 개정함.
2. **공지 발송 CLI 스크립트 (`scripts/send-announcement.ts`)**:
   - `DISCORD_TOKEN` 환경변수가 주어지지 않은 경우 명확한 에러메시지와 사용법 안내 후 종료.
   - `dry-run` 플래그 지원: `--dry-run` 인자가 전달되면 실제 Discord API 요청을 전송하지 않고 전송될 Embed/Message payload를 터미널에 예쁘게 출력함.
   - Discord API 응답 결과를 로깅하고 에러 시 상세 이유를 노출함.

## Risks / Trade-offs

- **[Risk]** 디스코드 봇 토큰 권한 부족 또는 채널 메시지 전송 권한 미부여 시 전송 실패.
  - **Mitigation**: `scripts/send-announcement.ts`에서 HTTP Status Code와 디스코드 API의 Error Payload를 상세히 감지하여 원인을 명확히 출력함.
- **[Risk]** 영문/한글 README 간의 불일치 발생.
  - **Mitigation**: README.ko.md와 README.md의 주요 기능/기술 항목 구조를 1:1로 맞추어 동일한 서식으로 업데이트함.
