## Why

관전자 입장에서 각 격돌이 정적인 결과만 보여주면 주사위를 굴리는 찰나의 짜릿함과 긴장감이 부족합니다.
검투사가 주사위 컵을 흔들며 족보를 노리는 롤링 애니메이션(Giphy GIF 및 도파민 서스펜스 멘트)을 선행 표시하고, 턴당 딜레이를 3.0~3.5초로 여유 있게 늘려 일반 스포츠 중계 이상의 박진감 넘치는 관전 경험을 제공합니다.

## What Changes

- **주사위 롤링 서스펜스 프레임 추가 (`serializeColosseumRolling`)**:
  - 각 주요 격돌(Act)마다 결과를 바로 공개하지 않고, 검투사가 주사위를 굴리는 역동적인 롤링 GIF(`DICE_ROLL_GIPHY_POOL`), 킵한 주사위 현황, 노리는 족보와 도파민 호언장담을 먼저 렌더링.
- **4대 격돌 막(Act) 중심의 2단계 연출 (롤링 서스펜스 ➔ 결과 적중)**:
  - Act 1: R03 초반 기선제압 (롤링 3초 ➔ 득점 적중 3.5초)
  - Act 2: R06 상단 보너스 63점 분수령 (롤링 3초 ➔ 득점 적중 3.5초)
  - Act 3: R09 클러치 야추/스트레이트 승부처 (롤링 3초 ➔ 득점 적중 3.5초)
  - Act 4: R12 파이널 끝장 매치 (롤링 3초 ➔ 득점 적중 3.5초)
  - Act 5: 최종 승자 발표 및 ELO 정산
- **서스펜스 딜레이 확대**:
  - 롤링 중 3.0초 대기 ➔ 결과 확인 3.5초 대기로 턴을 천천히 음미할 수 있도록 타이밍 조정 (총 관전 시간 약 26~28초로 Cloudflare Worker 한도 내 최적화).

## Capabilities

### Modified Capabilities
- `fly-colosseum-betting`: 관전 임베드에 주사위 롤링 서스펜스 단계(애니메이션 GIF 및 기대 멘트) 및 3.0~3.5초 턴 딜레이 연출 추가.

## Impact

- `src/presentation/discord/adapter/serializer.ts`: `serializeColosseumRolling` 추가 및 롤링 임베드 직렬화.
- `src/application/GameWorkflowService.ts`: `executeColosseumMatchLogic`를 4대 막의 [롤링 서스펜스 ➔ 결과 적중] 2단계 순차 루프로 개편.
- `src/application/colosseumWorkflow.test.ts`: 롤링 + 결과 순차 갱신 검증.
