## Context

현재 Yacht Dice 게임에서 턴 전환 시 다음 플레이어를 멘션하는 메시지가 디스코드 채널에 일반 메시지로 전송됩니다. 이로 인해 여러 게임이 진행 중이거나 채널의 대화 내용이 섞여 있을 때 사용자가 멘션을 클릭하여 해당 게임판 메시지(원본 인터랙션 메시지)로 돌아갈 방법이 없습니다. 

Discord API의 메시지 생성 엔드포인트(`POST /channels/{channel.id}/messages`)는 `message_reference` 필드를 통해 기존 메시지에 대한 답장(Reply) 형태로 메시지를 발송할 수 있도록 지원합니다. 본 설계에서는 턴 멘션 발송 시 원본 게임판 메시지 ID를 `message_reference`로 담아 발송하여, 디스코드 UI 상에서 원본 메시지로 바로 갈 수 있는 링크 기능을 활성화하고자 합니다.

## Goals / Non-Goals

**Goals:**
- `DiscordApiService.sendMention` 서비스의 메서드 시그니처를 확장하여 선택적으로 원본 메시지 ID(`replyToMessageId`)를 받을 수 있도록 합니다.
- Discord REST API 호출 시 `message_reference`와 `fail_if_not_exists: false` 옵션을 명시하여 답장 형태로 발송합니다.
- `src/index.ts`의 게임 턴 전환 처리 영역에서 현재 interaction의 원본 메시지 ID(`rawJson.message?.id`)를 가져와 멘션 발송 시점에 넘겨줍니다.
- 모의 서비스(`DiscordApiServiceMockLive`)와 기존 테스트 케이스가 바뀐 시그니처와 호환되도록 수정하고, 필요 시 관련 테스트 검증을 보강합니다.

**Non-Goals:**
- 멘션 전송 조건이나 멘션 삭제 동작(`deleteMessage`) 등 턴 멘션의 기본 수명 주기 흐름 자체를 바꾸지는 않습니다.
- 턴 전환 멘션 외의 일반 디스코드 메시지 응답 로직(예: 슬래시 커맨드 최초 응답)은 변경하지 않습니다.

## Decisions

### 결정 1: `DiscordApiService.sendMention` 시그니처 수정
```typescript
readonly sendMention: (
  channelId: string, 
  userId: string, 
  replyToMessageId?: string
) => Effect.Effect<string, Error>;
```
- **대안**: `sendMention`을 그대로 두고 `sendMentionReply`라는 별도의 메서드를 정의하기
- **Rationale**: 턴 전환 멘션의 목적 자체가 답장 형태를 취하는 것이고, 기존 API를 확장해 선택적 인자로 처리하는 것이 중복 코드를 줄이고 직관적입니다.

### 결정 2: `message_reference` 탑재 및 `fail_if_not_exists: false` 설정
Discord API 호출 시 Request Body를 다음과 같이 구성합니다.
```json
{
  "content": "<@userId>님, 당신의 턴입니다! 주사위를 굴려주세요. 🎲",
  "message_reference": {
    "message_id": "replyToMessageId",
    "fail_if_not_exists": false
  }
}
```
- **Rationale**: 만약 원본 게임판 메시지가 모종의 이유로 삭제되었더라도, `fail_if_not_exists`가 `true`(기본값)이면 Discord API 요청 자체가 실패(400 Bad Request)하게 됩니다. 알림 멘션 발송의 안정성을 확보하기 위해 반드시 `fail_if_not_exists: false`를 지정하여 원본 메시지가 존재하지 않더라도 멘션은 정상 전송되도록 처리합니다.

### 결정 3: `rawJson.message?.id`를 통한 원본 메시지 ID 추출
`src/index.ts` 내의 `handleInteraction` 함수 매개변수인 `rawJson`으로부터 `rawJson.message?.id`를 직접 획득합니다.
- **Rationale**: `ParsedInteraction` 데이터 구조를 변경하여 parser가 `messageId`를 추출하도록 설계할 수도 있으나, 이미 `handleInteraction`에 `rawJson`이 온전히 전달되고 있으므로, 추가적인 파서 구조 변경 없이 `rawJson.message?.id`를 활용하는 것이 최소한의 변경으로 안전하게 구현할 수 있는 방법입니다.

## Risks / Trade-offs

- **[Risk] 원본 메시지 ID가 존재하지 않는 인터랙션의 경우**
  - **Mitigation**: `replyToMessageId`는 선택적(Optional) 속성으로 정의하여, 값이 전달되지 않거나 유효하지 않은 경우 `message_reference` 없이 일반 멘션 메시지로 발송하도록 안전하게 폴백(Fallback) 처리합니다.
- **[Risk] 기존 테스트 코드와의 호환성 문제**
  - **Mitigation**: `src/index.test.ts`에 모의 구현된 `DiscordApiService`의 stub 함수들도 새로운 시그니처를 따르도록 파라미터를 맞추고 검증합니다.
