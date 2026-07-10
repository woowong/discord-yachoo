## Why

Cloudflare Workers(서버리스 웹훅) 환경에서 디스코드 서버로부터 들어오는 HTTP POST Interaction 요청을 처리하려면 보안 서명 검증과 요청 데이터 분석이 필요합니다. 비인가 요청을 차단하기 위한 Ed25519 서명 검증 및 슬래시 커맨드/버튼 입력을 게임 명령어로 해석해주는 어댑터 레이어를 구축합니다.

## What Changes

* 디스코드 API 명세에 따른 HTTP Header(`X-Signature-Ed25519`, `X-Signature-Timestamp`) 기반 Ed25519 서명 검증 모듈 추가 (Web Crypto API 활용)
* 디스코드 Interactions 페이로드(Type 1: PING, Type 2: Application Command, Type 3: Message Component) 파싱을 위한 TypeScript 및 Effect.ts Schema 정의
* 디스코드 슬래시 커맨드(`/challenge`, `/profile`, `/leaderboard`)와 게임 진행 버튼(주사위 홀드, 다시 굴리기, 점수 입력) 상호작용 입력의 라우팅 구조 구현
* 디스코드 임베드와 버튼, 드롭다운 형식을 처리하기 위한 JSON 응답 포맷터 유틸리티 작성

## Capabilities

### New Capabilities
- `discord-signature-verifier`: 디스코드에서 전송된 웹훅의 헤더와 바디 데이터를 검증하여 유효한 요청인지 인증하는 암호학적 보안 기능 구축
- `discord-interaction-parser`: 디스코드의 Interactions 데이터를 순수 게임 행동(Action) 객체로 파싱하고, 게임 상태 결과를 다시 디스코드 메시지 페이로드로 직렬화(Serialize)해주는 기능 구축

### Modified Capabilities
*없음*

## Impact

* `src/presentation/discord/adapter/` 디렉토리에 서명 검증 및 인터랙션 분석 코드가 추가됩니다.
* 이 모듈은 오직 디스코드 API 사양과 Web Crypto API에만 의존하며, 핵심 게임 로직과는 분리되어 작동합니다.
