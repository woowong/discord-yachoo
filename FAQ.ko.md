# OpenSpec Specs-based FAQ (자주 묻는 질문)

이 문서는 프로젝트의 OpenSpec 사양서들([openspec/specs/](./openspec/specs))에 정의된 동작 사양을 바탕으로 작성된 자주 묻는 질문(FAQ)집입니다. 

---

## 📂 카테고리
1. [야추 게임 규칙 및 상태 머신 (Yacht Score Rules & State Machine)](#1-야추-게임-규칙-및-상태-머신-yacht-score-rules--state-machine)
2. [디스코드 봇 연동 및 명령어 (Discord Integration & Commands)](#2-디스코드-봇-연동-및-명령어-discord-integration--commands)
3. [영속성 및 데이터베이스 구조 (Persistence & D1 DB Schema)](#3-영속성-및-데이터베이스-구조-persistence--d1-db-schema)
4. [아키텍처 및 로컬 테스트 (Architecture & Dev Simulator)](#4-아키텍처-및-로컬-테스트-architecture--dev-simulator)

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

---

## 2. 디스코드 봇 연동 및 명령어 (Discord Integration & Commands)

### Q. 지원하는 디스코드 슬래시(/) 명령어는 무엇이 있나요?
**A.**
* `/challenge`: 새로운 야추 게임을 시작합니다. 상대방 지정 옵션이 없으면 1인용 게임을, 상대방을 지정하면 해당 사용자와의 2인용 게임을 생성합니다. [game-orchestrator/spec.md](./openspec/specs/game-orchestrator/spec.md#L24-L34)
* `/profile`: 현재 디스코드 서버(Guild)에서의 플레이어 통계를 보여줍니다. [game-orchestrator/spec.md](./openspec/specs/game-orchestrator/spec.md#L35-L41)
* `/leaderboard`: 현재 디스코드 서버 내의 플레이어 순위(리더보드)를 출력합니다. [game-orchestrator/spec.md](./openspec/specs/game-orchestrator/spec.md#L42-L48)
* `/history`: 사용자의 최근 경기 내역(최대 5개) 및 각 경기의 턴별 상세 진행 로그(페이지 이동 가능)를 보여줍니다. [game-orchestrator/spec.md](./openspec/specs/game-orchestrator/spec.md#L64-L74)

### Q. 멀티플레이어 게임에서 내 차례가 되었을 때 알림을 받을 수 있나요?
**A.** 네. 턴이 상대방에게로 넘어갈 때 다음 차례 플레이어의 디스코드 채널로 멘션 메시지가 전송됩니다. 이때 멘션의 메시지 ID와 채널 ID는 게임 상태(`GameState`)에 기록됩니다. [turn-mention-notification/spec.md](./openspec/specs/turn-mention-notification/spec.md#L6-L12)

### Q. 알림 멘션 메시지는 계속 남아있나요?
**A.** 아니요. 멘션을 받은 사용자가 자신의 차례를 인지하고 주사위를 굴리거나 Hold를 토글하는 등 **첫 액션을 수행하면 멘션 메시지는 자동으로 삭제(ACK 처리)**됩니다. [turn-mention-notification/spec.md](./openspec/specs/turn-mention-notification/spec.md#L13-L23)

### Q. 이미 끝난 게임 메시지의 주사위 롤이나 카테고리 선택 버튼을 누르면 어떻게 되나요?
**A.** 예전 메시지 등에 남아있는 컴포넌트를 누르더라도 시스템이 `GameAlreadyOverError`를 감지하여, 사용자에게 에러 창을 띄우는 대신 **해당 메시지의 컴포넌트(버튼 및 드롭다운)를 지우고 깔끔하게 종료된 최종 상태로 메시지를 리프레시**합니다. [finished-game/spec.md](./openspec/specs/finished-game/spec.md#L22-L34)

### Q. 디스코드 웹훅의 보안을 어떻게 유지하나요?
**A.** 디스코드 서버에서 오는 모든 웹훅 요청은 `X-Signature-Ed25519` 및 `X-Signature-Timestamp` 헤더와 봇의 공개 키를 사용하여 **Ed25519 서명 검증**을 거칩니다. 검증되지 않거나 헤더가 없는 요청은 401 Unauthorized로 거부됩니다. [discord-signature-verifier/spec.md](./openspec/specs/discord-signature-verifier/spec.md#L8-L22)

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

---

## 4. 아키텍처 및 로컬 테스트 (Architecture & Dev Simulator)

### Q. 디스코드 API 연동 없이 로컬에서 바로 테스트할 수 있는 방법이 있나요?
**A.** 네. CLI 게임 러너([cli-game-runner](./openspec/specs/cli-game-runner))가 포함되어 있어 터미널 환경에서 아스키 스코어보드를 보며 싱글/멀티플레이 시뮬레이션을 수행할 수 있습니다. 

### Q. 프로젝트의 전반적인 기술 스택과 폴더 구조가 궁금합니다.
**A.**
- **핵심 기술**: **Effect.ts** 에코시스템(`effect`, `@effect/platform`, `@effect/schema`), Cloudflare Workers & D1 (`wrangler`), **Vitest** (테스트 러너), **TypeScript** [project-infra-setup/spec.md](./openspec/specs/project-infra-setup/spec.md#L6-L33)
- **아키텍처 구조 (AGENTS.md 규칙)**:
  - `src/domain/`: 주사위 계산, 상태 머신 흐름 등 순수 도메인 로직 (외부 의존성 없음, Pure Functions).
  - `src/persistence/`: Cloudflare D1 바인딩 및 전적 데이터 저장소 계층 (Repository 패턴).
  - `src/presentation/`: 디스코드 인터랙션 웹훅 처리, 서명 검증(Ed25519) 및 CLI 게임 시뮬레이터.
> [!TIP]
> 아키텍처 원칙에 관한 세부 원칙은 프로젝트 루트의 [AGENTS.md](./AGENTS.md)를 참조하십시오.
