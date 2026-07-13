# 디스코드 야추 다이스 봇 (`discord-yachoo`)

[![Language](https://img.shields.io/badge/Language-TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![Runtime](https://img.shields.io/badge/Runtime-Cloudflare%20Workers-orange.svg)](https://workers.cloudflare.com/)
[![Framework](https://img.shields.io/badge/Framework-Effect.ts-lightgrey.svg)](https://effect.website/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

디스코드에서 **야추 다이스(Yacht Dice / Yahtzee)** 게임을 즐길 수 있는 서버리스 디스코드 봇입니다. **Cloudflare Workers**와 **Effect.ts** 함수형 프로그래밍 에코시스템, 그리고 **Cloudflare D1** SQLite 데이터베이스를 기반으로 제작되었습니다.

> **English Version:** 영문 문서는 [README.md](./README.md)를 참고해 주세요.

---

## 주요 특징

- **서버리스 & 웹훅 방식:** 상시 연결 소켓(Gateway) 방식이 아닌, Discord가 전송하는 **Interactions Webhook HTTP POST** 요청을 수신하는 방식으로 빌드됩니다. 덕분에 Cloudflare Workers 무료 등급 범위 내에서 비용 없이 영구적으로 봇을 유지할 수 있습니다.
- **인터랙티브 UI 컴포넌트:** 디스코드 채팅 메시지 내에서 임베드, 셀렉트 메뉴, 버튼 컴포넌트를 사용하여 주사위를 킵하거나 점수판을 클릭하며 직관적으로 게임을 플레이할 수 있습니다.
- **1인 / 2인 모드 지원:** 솔로 플레이로 최고 점수에 도전하는 1인 싱글 모드와 1v1로 디스코드 서버 내 유저와 승부를 가리는 2인 멀티 모드를 모두 지원합니다.
- **ELO 레이팅 및 리더보드:** 1v1 멀티플레이어 결과에 따라 변동되는 ELO 레이팅 시스템을 제공하며, 서버 리더보드가 단순 승수가 아닌 ELO 기준으로 정렬됩니다.
- **항복 및 안전장치 기능:** 게임 중 언제든지 기권할 수 있는 항복 기능이 추가되었습니다. 자신에 대한 결투 신청 방지 및 주사위 5개가 모두 홀드된 상태에서의 무의미한 롤링 시도를 UI 차원에서 방지합니다.
- **모바일 뷰 최적화:** 모바일 디스코드 화면에서 깨짐을 방지하는 27자 이내 컴팩트 아스키 스코어보드, 플레이어 이름 4자 제한, 상단 보너스 달성 진척도(`현재점수/63`) 시각화를 제공합니다.
- **순수 도메인 엔진:** 핵심 비즈니스 로직(주사위 계산, 룰 판단, 턴 제어)이 순수 함수(Pure Functions)로 구성되어 있어 인프라 환경과 완벽히 격리되며, Unit Test 100% 검증이 가능합니다.
- **로컬 CLI 시뮬레이터:** 디스코드 연동이나 서버 배포 없이도 로컬 터미널에서 즉시 주사위를 굴리고 콘솔 화면으로 게임을 플레이해볼 수 있습니다.

---

## 기술 스택

- **실행 환경:** [Cloudflare Workers](https://workers.cloudflare.com/)
- **데이터베이스:** [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite)
- **함수형 프로그래밍:** [Effect.ts](https://effect.website/) (안전한 에러 핸들링, 태그 기반 의존성 주입)
- **테스트:** [Vitest](https://vitest.dev/)
- **개발 환경:** [tsx](https://github.com/privatenumber/tsx) & [TypeScript 7.0](https://www.typescriptlang.org/)

---

## 아키텍처 구조

이 프로젝트는 아키텍처 규칙([AGENTS.md](./AGENTS.md))에 따라 프레젠테이션 계층과 비즈니스 도메인, 영속성 계층을 철저하게 격리하여 설계되었습니다:

```
┌─────────────────────────────────────────────────────────┐
│                 Presentation Layer                      │
│      (디스코드 웹훅 어댑터 / 로컬 콘솔 시뮬레이터)      │
└────────────────────────────┬────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────┐
│                  Core Game Engine                       │
│    (순수 도메인 로직: 야추 룰 점수 계산 및 상태 머신)    │
└────────────────────────────┬────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────┐
│                  Persistence Layer                      │
│        (D1 데이터베이스 레포지토리 / 인메모리 저장소)   │
└─────────────────────────────────────────────────────────┘
```

- **Core Game Engine (`src/domain/`)**: 주사위 롤링, 점수 가산, 승리 판별 등의 상태 머신. 외부 의존성(디스코드 API, DB)이 전혀 없는 순수 함수형 도메인입니다.
- **Presentation Layer (`src/presentation/`)**:
  - `discord/`: 디스코드 Interaction 웹훅 서명 검증 및 파싱을 수행하고, 도메인의 상태를 디스코드 Embed와 Button 컴포넌트로 시리얼라이즈합니다.
  - `console/`: 로컬 시뮬레이션용 Readline 인터페이스를 구현합니다.
- **Persistence Layer (`src/persistence/`)**: 플레이어 기록, 전적 순위표(Leaderboard), 진행 중인 세션을 저장하며 Repository 인터페이스 뒤로 캡슐화되어 있습니다.

---

## 로컬 개발 및 테스트 방법

### 1. 의존성 설치
TypeScript 7.0+ 및 Effect.ts 최신 환경을 로컬에 설치합니다:
```bash
npm install
```

### 2. 로컬 CLI 시뮬레이터 실행
디스코드 API 없이 터미널에서 즉시 1인/2인 야추 게임 시뮬레이션을 돌려볼 수 있습니다:
```bash
npm run simulate
```

### 3. 단위 테스트 수행
Vitest를 통해 도메인 비즈니스 로직과 웹훅 검증 로직 등의 테스트를 병렬로 수행합니다:
```bash
npm run test
```

### 4. 로컬 Wrangler 개발 서버 실행
로컬 환경에 가상 워커를 띄워 웹훅 동작을 테스트하고 디버깅할 수 있습니다:
```bash
npm run dev
```

---

## 배포 및 설정 방법

### 1. 디스코드 슬래시 커맨드 등록
Discord Developer Portal에서 만든 애플리케이션의 인증 정보를 환경 변수로 입력하여 커맨드 등록 스크립트를 실행합니다:
```bash
DISCORD_APP_ID="애플리케이션_ID" \
DISCORD_TOKEN="봇_토큰" \
DISCORD_GUILD_ID="테스트용_길드_ID(선택)" \
npm run register-commands
```

### 2. Cloudflare D1 데이터베이스 설정
원격 Cloudflare 서버에 D1 데이터베이스 인스턴스를 생성합니다:
```bash
npx wrangler d1 create yacht_dice
```
데이터베이스 생성이 완료되면 제공되는 `database_id`를 `wrangler.toml` 파일에 복사/붙여넣기 합니다.

이후 데이터베이스 마이그레이션(테이블 빌드)을 수행합니다:
```bash
# 로컬 개발용 DB 마이그레이션
npx wrangler d1 migrations apply yacht_dice --local

# 원격 프로덕션용 DB 마이그레이션
npx wrangler d1 migrations apply yacht_dice --remote
```

### 3. Cloudflare Workers 배포
Wrangler를 이용하여 빌드 및 배포를 진행합니다:
```bash
npx wrangler deploy
```

### 4. 디스코드 개발자 포털 연동
1. [Discord Developer Portal](https://discord.com/developers/applications)로 접속합니다.
2. 해당 Application의 **General Information** 메뉴에서 **Interactions Endpoint URL** 영역에 배포된 워커의 웹 서버 주소(예: `https://discord-yachoo.<your-subdomain>.workers.dev`)를 입력하고 저장합니다.
3. 웹훅 인증을 수행할 수 있도록 Workers 환경설정에 디스코드 퍼블릭 키를 시크릿으로 등록합니다:
   ```bash
   npx wrangler secret put DISCORD_PUBLIC_KEY
   ```

---

## 라이선스 (License)

이 프로젝트는 MIT 라이선스에 따라 자유롭게 사용 및 배포가 가능합니다. 자세한 사항은 [LICENSE](LICENSE)를 참고하세요.
