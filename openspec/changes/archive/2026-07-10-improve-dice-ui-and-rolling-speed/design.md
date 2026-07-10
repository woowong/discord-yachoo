## Context

현재 디스코드 Yacht Dice 게임에서 주사위를 굴렸을 때의 시각 효과가 부족하고, 데이터베이스(D1) 쓰기 지연 때문에 버튼 인터랙션 시 약 300ms~600ms 동안 UI가 정지된 상태로 렉이 걸린 것처럼 느껴지는 사용성 저하가 있습니다. 또한, 주사위의 눈금이 유니코드 텍스트로 작게 렌더링되어 다크 모드 등에서 가독성이 떨어집니다. 이 디자인 문서는 지연된 웹훅 응답(Deferred Webhook PATCH)을 적용해 체감 속도를 즉시 반응하도록 개선하고, 주사위 렌더링을 고가독성 이모지로 업그레이드하기 위한 구체적인 기술 설계를 정의합니다.

## Goals / Non-Goals

**Goals:**
* 주사위 숫자 텍스트를 디스코드 표준 이모지 명칭(`:one:`~`:six:`)으로 변경하여 큼직하고 보기 쉽게 가독성 개선.
* 주사위 홀드 버튼 및 주사위 굴리기 버튼에 적합한 native `emoji` 아이콘 속성 적용.
* 주사위 롤링 인터랙션 발생 시 즉각 응답(UpdateMessage, 모든 컴포넌트 비활성화, 롤링 GIF 및 애니메이션 텍스트 표시) 처리.
* Cloudflare Workers의 `ctx.waitUntil`을 활용해 백그라운드에서 1.2초 후 Discord Webhook PATCH API를 호출하여 최종 주사위 결과를 반영하도록 메시지 업데이트.

**Non-Goals:**
* 1인용/2인용 게임 룰 및 상태 머신 자체의 로직 수정.
* D1 데이터베이스 스키마 자체의 수정 (기존 테이블 구조 그대로 사용).
* 주사위 롤링 외의 카테고리 기입 등의 다른 일반 액션에 롤링 애니메이션 적용.

## Decisions

### 1) 디스코드 Webhook 수정 방식: REST API Direct PATCH 호출
* **결정:** 별도의 디스코드 봇 토큰 없이, 들어오는 Interaction payload에서 제공하는 `application_id`와 `token`을 사용하여 Discord Webhook API에 직접 PATCH 요청을 보냅니다.
* **이유:** Discord interaction token은 15분 동안 유효하며 해당 인터랙션 메시지를 업데이트할 수 있는 권한을 제공합니다. 따라서 별도의 봇 토큰 환경변수를 주입하지 않고도 `@original` 응답 메시지를 수정할 수 있습니다.
* **대안:** Discord gateway 봇 연결 또는 REST 클라이언트 라이브러리 사용. -> Cloudflare Workers의 경량성을 유지하고 RTT와 메모리 오버헤드를 없애기 위해 표준 `fetch` 함수를 통한 직접 HTTPS 호출이 최선입니다.

### 2) 주사위 홀드 버튼의 시각 디자인 개선
* **결정:** 버튼의 label 내부에 유니코드 주사위 대신 `emoji` 객체를 전달하여 디스코드 클라이언트가 아이콘을 버튼 내에 정렬해 보여주도록 수정합니다.
  ```typescript
  // types.ts
  export interface DiscordButton {
    readonly type: 2;
    readonly style: 1 | 2 | 3 | 4 | 5;
    readonly label: string;
    readonly custom_id?: string;
    readonly emoji?: {
      readonly name?: string;
      readonly id?: string;
    };
    readonly disabled?: boolean;
  }
  ```
  * `emoji: { name: "1️⃣" }`와 같이 각 주사위 값에 매칭되는 숫자 이모지를 추가하고, 라벨은 `[1] Held` 등으로 최소화합니다.

### 3) 백그라운드 태스크 제어: ExecutionContext.waitUntil
* **결정:** Cloudflare Workers의 `fetch` 핸들러 3번째 인자인 `ctx: ExecutionContext`를 받아와 `ctx.waitUntil` 내에서 백그라운드 딜레이 및 디스코드 API 호출을 실행합니다.
  ```typescript
  ctx.waitUntil(
    Effect.runPromise(
      Effect.gen(function* () {
        yield* Effect.sleep("1.2 seconds");
        // call Discord webhook patch api
      })
    )
  );
  ```
* **이유:** Workers는 HTTP 응답을 반환한 후 즉시 실행이 중단될 수 있으나, `ctx.waitUntil`을 사용하면 응답 반환 후에도 비동기 백그라운드 작업이 완료될 때까지 Worker 컨텍스트가 유지됩니다.

## Risks / Trade-offs

* **[Risk] 백그라운드 API 호출 실패**
  * **Mitigation:** Discord Webhook PATCH API 호출 실패 시 에러 로깅을 명확히 하고, 백그라운드 처리를 격리하여 게임 자체의 데이터 정합성(이미 D1에 계산된 결과는 저장 완료됨)은 해치지 않도록 구성합니다.
* **[Risk] 버튼 클릭 연타 시 경합 상황**
  * **Mitigation:** 주사위를 굴리기 시작할 때 반환되는 "롤링 화면"의 모든 인터랙티브 컴포넌트(버튼, 선택 메뉴)에 `disabled: true` 설정을 적용하여 사용자가 추가 클릭을 하지 못하도록 차단합니다.
