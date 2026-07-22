# OpenSpec Specs-based FAQ (자주 묻는 질문)

이 문서는 프로젝트의 OpenSpec 사양서들([openspec/specs/](./openspec/specs))에 정의된 동작 사양을 바탕으로 작성된 자주 묻는 질문(FAQ)집입니다. 

---

## 📂 카테고리
1. [야추 게임 규칙 및 상태 머신 (Yacht Score Rules & State Machine)](#1-야추-게임-규칙-및-상태-머신-yacht-score-rules--state-machine)
2. [디스코드 봇 연동 및 명령어 (Discord Integration & Commands)](#2-디스코드-봇-연동-및-명령어-discord-integration--commands)
3. [영속성 및 데이터베이스 구조 (Persistence & D1 DB Schema)](#3-영속성-및-데이터베이스-구조-persistence--d1-db-schema)
4. [웹 대시보드 및 분석 (Web Dashboard & Analytics)](#4-웹-대시보드-및-분석-web-dashboard--analytics)
5. [아키텍처 및 로컬 테스트 (Architecture & Dev Simulator)](#5-아키텍처-및-로컬-테스트-architecture--dev-simulator)

---

## 1. 야추 게임 규칙 및 상태 머신 (Yacht Score Rules & State Machine)

### Q. 야추 게임의 상단 보너스(Upper Section Bonus)는 어떻게 받나요?
**A.** 상단 카테고리(Aces, Deuces, Treys, Fours, Fives, Sixes)의 점수 합계가 **63점 이상**일 때 **35점**의 보너스 점수가 추가로 부여됩니다. (62점 이하는 0점) [yacht-score-rules/spec.md](./openspec/specs/yacht-score-rules/spec.md#L89-L98)

### Q. 각 족보(카테고리)별 점수 계산 방식이 어떻게 되나요?
**A.**
* **상단 항목 (Aces ~ Sixes)**: 주사위 중 선택한 숫자들의 눈금 합
* **Choice**: 주사위 5개의 전체 합
* **Four of a Kind**: 동일한 눈금의 주사위가 4개 이상일 때 5개 주사위의 전체 합 (조건 미달 시 0점)
* **Full House**: 세 개의 동일 눈금 + 한 쌍의 동일 눈금이거나, 5개 모두 동일한 눈금(Yacht)일 때 5개 주사위의 전체 합 (조건 미달 시 0점)
* **Small Straight**: 4개 이상의 주사위 눈금이 연속할 때 (1-2-3-4, 2-3-4-5, 3-4-5-6) 고정 **15점** (Large Straight 조건 만족 시에도 15점 획득 가능)
* **Large Straight**: 5개 주사위 눈금이 모두 연속할 때 (1-2-3-4-5, 2-3-4-5-6) 고정 **30점**
* **Yacht**: 5개 주사위 눈금이 모두 동일할 때 고정 **50점**
> [!NOTE]
> 자세한 계산 시나리오는 [yacht-score-rules/spec.md](./openspec/specs/yacht-score-rules/spec.md)에서 확인하실 수 있습니다.

### Q. 한 턴에 주사위를 최대 몇 번까지 굴릴 수 있나요?
**A.** 각 턴마다 최대 **3번**까지 주사위를 굴릴 수 있습니다. (첫 번째 롤링은 5개 전체 롤, 이후 2회는 원하는 주사위를 Hold하고 남은 주사위만 롤링 가능). 3번을 초과하여 주사위를 굴리려고 하면 `RollLimitExceededError`가 발생합니다. [yacht-state-machine/spec.md](./openspec/specs/yacht-state-machine/spec.md#L19-L33)

### Q. 주사위를 굴리지 않은 상태에서 카테고리를 선택하여 턴을 넘길 수 있나요?
**A.** 아니요. 턴 시작 후 최소 1번 이상 주사위를 굴려야 카테고리를 선택할 수 있습니다. 굴리지 않은 상태에서 시도하면 `InvalidStateActionError`가 발생합니다. 또한 이미 채워진 카테고리를 재선택할 경우 `CategoryAlreadyFilledError`가 발생합니다. [yacht-state-machine/spec.md](./openspec/specs/yacht-state-machine/spec.md#L34-L48)

### Q. 1인용 모드와 2인용 모드의 턴 전환 차이는 무엇인가요?
**A.** 카테고리를 선택하여 기록하면 롤 횟수가 0으로 리셋되며 턴이 전환됩니다. 
- **1인용(Single)**: 동일한 플레이어에게 턴이 계속 유지됩니다.
- **2인용(Multi)**: 상대 플레이어로 턴이 전환됩니다. [yacht-state-machine/spec.md](./openspec/specs/yacht-state-machine/spec.md#L49-L59)

### Q. 주사위를 5개 모두 홀드(Hold)하고 롤(Roll)을 누르면 어떻게 되나요?
**A.** 무의미한 롤링 액션을 방지하기 위해 디스코드 UI 상에서 "주사위 굴리기" 버튼이 비활성화(`disabled: true`) 처리됩니다. 상태 머신 내부적으로도 5개 모두 홀드된 상태로의 롤링 요청은 `AllDiceHeldError`로 차단됩니다. [yacht-state-machine/spec.md](./openspec/specs/yacht-state-machine/spec.md#L82-L96)

### Q. 게임 도중에 기권(항복)할 수 있나요?
**A.** 네, 게임이 진행 중일 때 자신의 차례가 아니더라도 "기권(Surrender)" 버튼을 클릭하여 항복을 제안할 수 있습니다. 항복 버튼 클릭 시 상대방에게 항복 제안(`[수락]`, `[거절]`) 메시지가 전송되며, 상대방이 **수락**하면 게임이 즉시 Surrender KO로 종료되고 승패 및 ELO 레이팅이 정산됩니다. 상대방이 **거절**하면 항복 신청이 취소되고 경기가 정상 진행됩니다. [game-orchestrator/spec.md](./openspec/specs/game-orchestrator/spec.md)

---

## 2. 디스코드 봇 연동 및 명령어 (Discord Integration & Commands)

### Q. 지원하는 디스코드 슬래시(/) 명령어는 무엇이 있나요?
**A.**
* `/challenge` (또는 `/yachoo challenge`): 새로운 야추 게임을 시작합니다. 상대방 지정 옵션이 없으면 1인용 게임을 즉시 시작하고, `@상대방`을 지정하면 해당 사용자에게 5분 제한 초대전 메시지를 전송합니다. [game-invitation/spec.md](./openspec/specs/game-invitation/spec.md)
* `/match` (또는 `/yachoo match`): 오픈 매치메이킹 큐(대기열)에 진입합니다. 이미 대기열에서 기다리는 다른 유저가 있다면 즉시 1v1 대전이 매칭됩니다. [matchmaking-queue/spec.md](./openspec/specs/matchmaking-queue/spec.md)
* `/profile`: 현재 디스코드 서버(Guild)에서의 플레이어 통계를 보여줍니다. [game-orchestrator/spec.md](./openspec/specs/game-orchestrator/spec.md#L35-L41)
* `/leaderboard`: 현재 디스코드 서버 내의 플레이어 순위(리더보드)를 출력합니다. [game-orchestrator/spec.md](./openspec/specs/game-orchestrator/spec.md#L42-L48)
* `/history`: 사용자의 최근 경기 내역(최대 5개) 및 각 경기의 턴별 상세 진행 로그(페이지 이동 가능)를 보여줍니다. [game-orchestrator/spec.md](./openspec/specs/game-orchestrator/spec.md#L64-L74)

### Q. 5분 초대전(Challenge)의 수락 제한 시간 및 만료 조건은 어떻게 되나요?
**A.** 상대방을 지목하여 대전을 신청하면 대상 플레이어에게 `[수락]`, `[거절]` 버튼이 포함된 초대전이 전송되며, **5분(300초)** 간 유효합니다. 상대방이 5분 이내에 수락하지 않거나 거절하면 초대는 자동 만료(`EXPIRED` 또는 `DECLINED`)되며 대전이 시작되지 않습니다. [game-invitation/spec.md](./openspec/specs/game-invitation/spec.md)

### Q. 오픈 매치메이킹(`/match`)은 어떻게 작동하나요?
**A.** `/match` 명령어를 실행하면 플레이어는 오픈 매치메이킹 큐에 등록됩니다. 이미 대기 중인 플레이어가 있는 경우 두 유저가 즉시 1v1 매치로 연결되어 경기가 생성됩니다. 대기 중인 유저가 없으면 대기 상태로 머물며 언제든지 매칭 취소가 가능합니다. [matchmaking-queue/spec.md](./openspec/specs/matchmaking-queue/spec.md)

### Q. 멀티플레이어 게임에서 내 차례가 되었을 때 알림을 받을 수 있나요?
**A.** 네. 턴이 상대방에게로 넘어갈 때 다음 차례 플레이어의 디스코드 채널로 멘션 메시지가 전송됩니다. 이때 멘션의 메시지 ID와 채널 ID는 게임 상태(`GameState`)에 기록됩니다. [turn-mention-notification/spec.md](./openspec/specs/turn-mention-notification/spec.md#L6-L12)

### Q. 알림 멘션 메시지는 계속 남아있나요?
**A.** 아니요. 멘션을 받은 사용자가 자신의 차례를 인지하고 주사위를 굴리거나 Hold를 토글하는 등 **첫 액션을 수행하면 멘션 메시지는 자동으로 삭제(ACK 처리)**됩니다. [turn-mention-notification/spec.md](./openspec/specs/turn-mention-notification/spec.md#L13-L23)

### Q. 이미 끝난 게임 메시지의 주사위 롤이나 카테고리 선택 버튼을 누르면 어떻게 되나요?
**A.** 예전 메시지 등에 남아있는 컴포넌트를 누르더라도 시스템이 `GameAlreadyOverError`를 감지하여, 사용자에게 에러 창을 띄우는 대신 **해당 메시지의 컴포넌트(버튼 및 드롭다운)를 지우고 깔끔하게 종료된 최종 상태로 메시지를 리프레시**합니다. [finished-game/spec.md](./openspec/specs/finished-game/spec.md#L22-L34)

### Q. 디스코드 웹훅의 보안을 어떻게 유지하나요?
**A.** 디스코드 서버에서 오는 모든 웹훅 요청은 `X-Signature-Ed25519` 및 `X-Signature-Timestamp` 헤더와 봇의 공개 키를 사용하여 **Ed25519 서명 검증**을 거칩니다. 검증되지 않거나 헤더가 없는 요청은 401 Unauthorized로 거부됩니다. [discord-signature-verifier/spec.md](./openspec/specs/discord-signature-verifier/spec.md#L8-L22)

### Q. 나 자신에게 1v1 결투 신청(/challenge)을 할 수 있나요?
**A.** 아니요. 디스코드에서 상대방을 자신으로 선택하여 `/challenge`를 실행하면 에러 메시지와 함께 게임 생성이 차단됩니다. [game-orchestrator/spec.md](./openspec/specs/game-orchestrator/spec.md#L30-L34)

### Q. 디스코드 모바일 화면에서 아스키 스코어보드 줄이 깨지는데 해결되었나요?
**A.** 모바일 화면 최적화를 위해 스코어보드가 가로 27자 이내로 자동 축소 설계되었습니다. 플레이어 이름은 최대 4글자로 자동 줄임 처리되며, 보너스(35점) 달성도 현황(`현재합계/63`)을 실시간으로 표시하여 모바일 환경에서도 깔끔하게 보실 수 있습니다. [yacht-state-machine/spec.md](./openspec/specs/yacht-state-machine/spec.md#L97-L118)

---

## 3. 영속성 및 데이터베이스 구조 (Persistence & D1 DB Schema)

### Q. 플레이어 전적은 어떤 단위로 저장되나요?
**A.** 전적은 **각 디스코드 서버(Guild) 단위**와 **글로벌 단위** 두 가지 모두 기록됩니다.
- `guild_player_stats` 테이블을 통해 서버별 독립된 통계(싱글 플레이 횟수, 싱글 최고점, 멀티 승/무/패, 멀티 최고점)를 저장합니다. [d1-database-schema/spec.md](./openspec/specs/d1-database-schema/spec.md#L50-L67)
- 하위 호환성을 위해 글로벌 `players` 테이블에도 누적 기록이 동시에 업데이트됩니다. [persistence-repository/spec.md](./openspec/specs/persistence-repository/spec.md#L15-L15)

### Q. 게임 진행 중 일어난 주사위 기록이나 히스토리도 저장되나요?
**A.** 네. 매 경기가 종료되면 전체 경기 진행 과정(누가 어떤 주사위를 굴렸고, 어떤 카테고리를 골라 몇 점을 얻었는지 등)이 JSON 포맷으로 직렬화되어 `matches` 테이블의 `history_json` 컬럼에 영구 저장됩니다. 이 데이터는 `/history` 명령어 조회 시 활용됩니다. [persistence-repository/spec.md](./openspec/specs/persistence-repository/spec.md#L58-L71)

### Q. 데이터베이스는 무엇을 사용하며 어떻게 주입받나요?
**A.** Cloudflare D1 (SQLite 기반 서버리스 데이터베이스)을 사용하여 플레이어 데이터와 매치 로그를 보관합니다. `Effect.ts` 환경에서 `D1Database` 바인딩을 의존성 주입(Dependency Injection)받아 설계되어 특정 데이터베이스 드라이버나 모듈에 강결합되지 않습니다. [persistence-repository/spec.md](./openspec/specs/persistence-repository/spec.md#L51-L57)

### Q. 리더보드 순위는 어떤 기준으로 나열되나요?
**A.** 기존의 단순 승리 수 기준 정렬에서, 1v1 대결 결과를 바탕으로 변동되는 **ELO 레이팅(기본값 1000)** 기준으로 순위표가 산출되며 내림차순 정렬됩니다. [elo-rating/spec.md](./openspec/specs/elo-rating/spec.md#L12-L21)

---

## 4. 웹 대시보드 및 분석 (Web Dashboard & Analytics)

### Q. 디스코드 외에 웹 브라우저에서도 통계를 확인할 수 있나요?
**A.** 네. Worker의 루트 URL(`/` 또는 `/web/`)에서 브라우저 기반 싱글 페이지 분석 대시보드를 제공합니다. ELO 레이팅 히스토리 차트가 포함된 플레이어 프로필, 색상 코딩 및 실시간 점수 차이(Score Diff) 열이 포함된 턴별 매치 리플레이, 전설의 경기(Legend Matches) 카탈로그, 그리고 플레이어 디렉토리를 지원합니다. [web-dashboard/spec.md](./openspec/specs/web-dashboard/spec.md#L6-L8)

### Q. 전설의 경기(Legend Matches)란 무엇인가요?
**A.** 전설의 경기는 매치 히스토리에서 자동으로 식별되는 주목할 만한 게임 순간들입니다:
* **극적인 역전승 (Comeback Win)**: 10라운드 이후 25점 이상 뒤처지다 역전하여 승리한 경기
* **연속 고득점 (Hot Streak)**: 5턴 연속 15점 이상을 기록한 경기
* **야추 달성 (Yacht Achieved)**: 야추(Yacht, 50점)를 성공시킨 경기
* **연속 뇌절 (Epic Fail)**: 3턴 이상 연속으로 0점을 기록한 경기 [profile-stats/spec.md](./openspec/specs/profile-stats/spec.md#L20-L26)

### Q. 플레이어 평균 점수는 어떻게 계산되나요?
**A.** 평균 점수는 솔로(1인용)와 멀티(대전) 모드별로 별도 계산됩니다. 프로필에는 최근 10경기의 멀티 대전 결과가 W(승)/L(패)/D(무) 인디케이터로 표시됩니다. [profile-stats/spec.md](./openspec/specs/profile-stats/spec.md#L6-L18)

### Q. 웹 대시보드는 어떤 API 엔드포인트를 사용하나요?
**A.** 대시보드는 JSON API 엔드포인트를 사용합니다:
* `/web/api/profile/:playerId` — 플레이어 통계 및 최근 매치 (선택적 `guildId` 필터 지원; 생략 시 전체 길드의 글로벌 통계 반환)
* `/web/api/legend` — 전설의 경기 데이터셋
* `/web/api/players` — 등록된 플레이어 목록 [web-dashboard/spec.md](./openspec/specs/web-dashboard/spec.md#L28-L38)

---

## 5. 아키텍처 및 로컬 테스트 (Architecture & Dev Simulator)

### Q. 디스코드 API 연동 없이 로컬에서 바로 테스트할 수 있는 방법이 있나요?
**A.** 네. CLI 게임 러너([cli-game-runner](./openspec/specs/cli-game-runner))가 포함되어 있어 터미널 환경에서 아스키 스코어보드를 보며 싱글/멀티플레이 시뮬레이션을 수행할 수 있습니다. 

### Q. 프로젝트의 전반적인 기술 스택과 폴더 구조가 궁금합니다.
**A.**
- **핵심 기술**: **Effect.ts** 에코시스템(`effect`, `@effect/platform`, `@effect/schema`), Cloudflare Workers & D1 (`wrangler`), **Vitest** (테스트 러너), **TypeScript** [project-infra-setup/spec.md](./openspec/specs/project-infra-setup/spec.md#L6-L33)
- **아키텍처 구조 (AGENTS.md 규칙)**:
  - `src/domain/`: 주사위 계산, 상태 머신 흐름 등 순수 도메인 로직 (외부 의존성 없음, Pure Functions).
  - `src/application/`: 게임 워크플로우 오케스트레이션 및 전설 경기 분석, 도메인과 영속성·프레젠테이션 계층 연결.
  - `src/persistence/`: Cloudflare D1 바인딩 및 전적 데이터 저장소 계층 (Repository 패턴).
  - `src/presentation/`: 디스코드 인터랙션 웹훅 처리, 서명 검증(Ed25519), 웹 분석 대시보드 및 CLI 게임 시뮬레이터.
> [!TIP]
> 아키텍처 원칙에 관한 세부 원칙은 프로젝트 루트의 [AGENTS.md](./AGENTS.md)를 참조하십시오.

### Q. 오류나 네트워크 끊김 등으로 멈춰버린 게임이 있으면 어떻게 조치하나요?
**A.** 운영자는 아래 패치 스크립트를 실행하여 멈춘 특정 게임 ID를 강제 종료 상태로 마이그레이션할 수 있습니다:
```bash
npm run patch-game -- <game-id>
```
이 스크립트는 해당 매치를 강제 완료 상태로 갱신하고 디스코드 메시지의 상호작용 컴포넌트를 모두 정리합니다.
