# Yacht Dice Staging Environment Guide

이 문서는 Yacht Dice Discord 봇의 스테이징(Staging) 환경 구성 및 격리 테스트 방법을 설명합니다.

## 1. 개요 (Overview)
개발 중인 새로운 기능이나 리팩토링 변경사항이 프로덕션 서버에 영향을 주지 않도록, 별도의 격리된 Workers 인스턴스와 D1 데이터베이스(Staging)를 구성하여 테스트합니다.
`wrangler.toml`의 `[env.staging]` 환경을 통해 프로덕션 설정과 완전히 분리되어 관리됩니다.

---

## 2. 스테이징 구성 정보 (Staging Resources)
* **Staging Worker Name**: `discord-yachoo-stage`
* **Staging D1 Database**: `yacht_dice_stage`
  * **Database ID**: `f8368ba8-d490-418a-884d-cd27ab0cc3e7`
* **Endpoint URL**: `https://discord-yachoo-stage.woowong.workers.dev/`

---

## 3. 디스코드 개발 봇 설정 (Discord Dev Bot Setup)

스테이징 검증을 위해서는 프로덕션과 격리된 **별도의 디스코드 개발용 봇**이 필요합니다.

1. **디스코드 개발 봇 생성**:
   * [Discord Developer Portal](https://discord.com/developers/applications)에 접속하여 **New Application** 생성 (예: `Yacht Dice (Staging)`)
   * **General Information**에서 `Application ID` 와 `Public Key` 복사.
   * **Bot** 탭으로 이동하여 **Bot Token** 발급 (Reset Token 클릭).
   * **Bot** 탭 하단의 `Message Content Intent` 와 `Server Members Intent` 활성화 및 저장.

2. **Interactions Endpoint URL 등록**:
   * **General Information**의 `Interactions Endpoint URL` 자리에 스테이징 Workers Endpoint URL(`https://discord-yachoo-stage.woowong.workers.dev/`)을 입력하고 저장합니다.
   * *주의: Workers가 먼저 배포되고 `DISCORD_PUBLIC_KEY` 비밀 변수가 세팅되어야 정상 저장됩니다.*

3. **개발 봇 서버 초대**:
   * **OAuth2 -> URL Generator** 탭으로 이동.
   * **Scopes**: `bot`, `applications.commands` 선택.
   * **Bot Permissions**: `Send Messages`, `Embed Links`, `Use External Emojis`, `Manage Messages` 선택.
   * 생성된 URL로 개발 봇을 테스트 디스코드 서버에 초대합니다.

---

## 4. 로컬 환경 개발 및 동기화 명령어 (Commands)

### A. 스테이징 DB 스키마 마이그레이션 적용
로컬의 마이그레이션 변경점을 원격 스테이징 DB에 반영합니다:
```bash
npx wrangler d1 migrations apply yacht_dice_stage --remote --env staging
```

### B. 비밀 변수(Secrets) 바인딩
스테이징 Workers 인스턴스에 개발 봇의 환경 자격 증명을 등록합니다:
```bash
# Public Key 바인딩
npx wrangler secret put DISCORD_PUBLIC_KEY --env staging

# Bot Token 바인딩
npx wrangler secret put DISCORD_BOT_TOKEN --env staging
```

### C. 슬래시 커맨드 등록
테스트용 봇의 슬래시 커맨드를 특정 테스트 길드(서버)에 즉시 등록합니다:
```bash
DISCORD_APP_ID="[Application_ID]" \
DISCORD_TOKEN="[Bot_Token]" \
DISCORD_GUILD_ID="[테스트_디스코드_서버_ID]" \
npm run register-commands
```

### D. 스테이징 배포
개발 완료된 브랜치 코드를 스테이징 Workers에 반영합니다:
```bash
npx wrangler deploy --env staging
```
