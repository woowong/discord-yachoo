## Why

현재 유저는 `AI_FLY_BRAIN`과 1:1로 직접 대결할 수 있으나, 서로 다른 개성과 신경학적 특성을 지닌 초파리 검투사들이 맞붙는 경기를 실시간으로 관전하고 자신의 ELO를 베팅할 수 있는 엔터테인먼트 요소가 부족합니다.
유저들에게 커넥톰 SNN의 도파민(DAN/PAM/PPL1) 분비 상태에 따른 실시간 심리 상태와 대사를 메시지 임베드로 깔끔하게 관전하며, 승부 예측 및 ELO 베팅의 짜릿함을 제공하기 위해 이 변경을 제안합니다.

## What Changes

- **초파리 검투사 페르소나 4종 도입**:
  - 🔥 **폭주 잭팟 (Jackpot)**: PAM 과민 반응 및 높은 야추 노림수 지향
  - 🧠 **상식 뉴턴 (Newton)**: PPL1 억제 및 상단 보너스/안정 지향
  - ⚡ **질주 스피더 (Speeder)**: MBON 1 스트레이트 드라이브 특화
  - 🌀 **혼돈 키메라 (Chimera)**: 시냅스 노이즈 기반 변칙 플레이
- **디스코드 `/colosseum` 슬래시 명령어 추가**:
  - 임의의 두 초파리 검투사를 매칭하여 대전 공고 및 배당률 제시
  - 30초 카운트다운 베팅 페이즈 제공 (버튼 인터랙션으로 유저 본인의 ELO 베팅)
  - 파산 방지 안전 룰 (최소 10 ELO ~ 최대 50 ELO, 800 ELO 이하 보호)
- **단일 메시지 임베드 기반 도파민 연출 및 3단계 하이라이트 중계**:
  - 별도 채팅 스팸 없이 동일한 메시지 임베드를 3단계(베팅 마감 & 전반전 격돌 ➔ 후반전 클라이맥스 ➔ 최종 판정 및 정산)로 순차 갱신
  - 초파리의 실시간 도파민 수치 게이지(`[████████░░] 175%`) 및 심리 상태별 상황 대사 노출
- **ELO 베팅 정산 및 D1 영속화**:
  - 승리 초파리에 베팅한 유저에게 배당률에 따른 ELO 지급
  - 패배 초파리에 베팅한 유저의 ELO 차감 및 D1 `player_stats` 업데이트

## Capabilities

### New Capabilities
- `fly-colosseum-betting`: 디스코드 `/colosseum` 명령어를 통한 초파리 관전 매치 생성, ELO 베팅 풀 운영, 메시지 임베드 내 도파민/대사 3단계 중계 및 최종 배당금 정산.

### Modified Capabilities
- `flywire-pvp-duel`: 4종 페르소나별 신경 하이퍼파라미터(PAM boost, noise, category bias) 적용 지원 및 턴별 도파민 수치와 상황 대사를 포함한 관전용 타임라인 로그 생성 지원.

## Impact

- **Discord Presentation**: 새 명령어 `/colosseum` 추가 및 등록 스크립트(`scripts/register-commands.ts`) 업데이트. 단일 메시지 컴포넌트 인터랙션(`colosseum_bet:*`) 핸들러 추가.
- **Application & Domain**: `GameWorkflowService`에 콜로세움 매치 생성, ELO 베팅 등록, 비동기 시뮬레이션 오케스트레이션 및 배당 정산 로직 추가.
- **Python SNN Server (`web_server.py`)**: `POST /api/fly/duel` 엔드포인트를 추가하여 두 페르소나의 12라운드 맞대결 시뮬레이션 결과와 도파민/대사 타임라인을 일괄 반환.
- **Persistence (D1)**: 유저 ELO 차감 및 적립 트랜잭션 지원.
