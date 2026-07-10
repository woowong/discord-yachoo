## Context

Cloudflare Workers 환경에서 디스코드 서버로부터 들어오는 HTTP POST Interaction 요청을 안전하고 유연하게 처리하기 위해, 웹훅 서명 검증 모듈과 디스코드 Interaction 요청/응답 페이로드 파서 및 직렬화 어댑터를 구축합니다. 이 어댑터 레이어는 보안 검증(Ed25519)과 데이터 가공을 전담하며, 핵심 게임 비즈니스 로직(Core Engine)과 입출력 형태를 완벽히 분리하도록 돕습니다.

## Goals / Non-Goals

**Goals:**
* Web Crypto API를 활용하여 HTTP Header (`X-Signature-Ed25519`, `X-Signature-Timestamp`) 기반 Ed25519 서명 검증 모듈 개발.
* 디스코드 Interactions 페이로드(Type 1: PING, Type 2: Application Command, Type 3: Message Component)를 타입 안전하게 파싱할 수 있는 TypeScript 스키마 정의.
* 디스코드 커맨드(슬래시 명령어) 및 버튼 클릭 등 상호작용 페이로드를 순수 게임 행동(Action) 모델로 추상화 및 변환.
* 게임 상태(`GameState`) 또는 전적 데이터를 디스코드 메시지 포맷(JSON payload: embeds, components 등)으로 변환하는 직렬화기(Serializer) 구현.
* Effect.ts의 `Context.Tag` 기반으로 어댑터 계층을 설계하여 비즈니스 서비스에 의존성 주입 가능하도록 구조화.

**Non-Goals:**
* 디스코드 API 서버로 직접 HTTP 요청을 보내는 아웃바운드 REST 클라이언트(예: 채널 메시지 전송, 커맨드 일괄 등록 API 등)의 구현 (이는 통합 오케스트레이션 단계에서 다룸).
* 상태를 변경하는 게임 자체의 비즈니스 오케스트레이션 로직 구현.

## Decisions

### 1. Web Crypto API 기반 Ed25519 서명 검증
* 외부 JS 암호 라이브러리(예: `tweetnacl`) 대신 Cloudflare Workers 런타임에 기본 제공되며 성능이 우수한 **Web Crypto API** (`crypto.subtle`)를 사용해 Ed25519 서명을 검증합니다.
* 디스코드에서 전송하는 인증 바디는 `timestamp + body` 문자열을 바이너리로 인코딩한 데이터입니다.
* 서명 검증 알고리즘 명칭은 `"Ed25519"`를 사용해 `crypto.subtle.importKey` 및 `crypto.subtle.verify`를 실행합니다.

### 2. Discord Interaction Payload 파서 및 어댑터 설계
* 디스코드에서 넘어오는 JSON 구조를 안전하게 파싱하기 위한 인터페이스를 정의합니다.
* **`InteractionParser`**:
  * 디스코드 웹훅 바디(`JSON`)를 분석하여 요청 유형에 따라 적절한 데이터 구조로 변환합니다.
  * PING(유형 1)인 경우 검증 통과 후 즉시 PONG(유형 1) 응답을 만들 수 있도록 분기합니다.
  * Application Command(유형 2) 및 Message Component(유형 3)를 어플리케이션이 이해할 수 있는 내부 도메인 커맨드로 매핑합니다.
* **`ResponseSerializer`**:
  * 게임의 상태(`GameState`)와 플레이어 전적 결과(`PlayerStats`)를 디스코드 메시지 스펙(Rich Embed 및 Action Row 내의 Interactive Button 등)에 맞추어 JSON 객체로 빌드합니다.

### 3. Effect.ts 서비스 추상화
* `DiscordSignatureVerifier`와 `DiscordInteractionAdapter` 인터페이스를 Context Tag로 선언하여 구현체(`Live`)와 사양을 분리합니다.
* 이를 통해 테스트 시 서명 검증을 바이패스(Bypass)하거나 모의 페이로드로 가상 매치를 진행하는 통합 테스트 코드를 매우 쉽게 작성할 수 있습니다.

## Risks / Trade-offs

* **[Risk] Web Crypto API의 서명 검증 실패 및 런타임 예외**
  * *Mitigation*: 서명 문자열이 올바른 Hex 형식이 아니거나 키 포맷이 맞지 않아 발생할 수 있는 런타임 오류는 Effect의 `Effect.tryPromise`로 감싸서 `SignatureValidationError` 형식의 안전한 에러 타입으로 격리합니다.
* **[Risk] 디스코드 API 페이로드 변화로 인한 파싱 실패**
  * *Mitigation*: 인터랙션 페이로드 파싱 시 null/undefined 안전을 보장하는 구조적 유효성 검사 로직을 수반하여 예기치 못한 API 스펙 변화에도 애플리케이션 크래시 없이 디스코드에 오류 에러 메시지(Ephemeral Response)를 반환할 수 있도록 설계합니다.
