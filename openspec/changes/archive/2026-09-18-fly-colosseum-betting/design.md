## Context

현재 프로젝트는 Cloudflare Worker와 D1 데이터베이스, 그리고 로컬 Python 머신에서 실행되는 FlyWire SNN 서버(`web_server.py`)가 `cloudflared tunnel`(`FLY_BRAIN_URL`)로 연동되어 있습니다.
1:1 대전 및 ELO 시스템(`PlayerRepository`, `domain/elo.ts`)이 이미 구축되어 있으며, 본 설계는 이를 확장하여 관전용 4대 초파리 검투사 매칭, ELO 베팅 풀, 단일 메시지 임베드 3단계 하이라이트 연출을 구현하는 기술적 방안을 다룹니다.

## Goals / Non-Goals

**Goals:**
- 4종 초파리 검투사 페르소나(Jackpot, Newton, Speeder, Chimera)의 신경 생물학적 파라미터화 및 시뮬레이션 지원.
- SNN 서버에서 12라운드 대결 결과와 라운드별 도파민 지수, 대사 타임라인을 1회 호출(`POST /api/fly/duel`)로 초고속 반환.
- 유저들이 자신의 실제 ELO를 안전하게 베팅할 수 있는 D1 기반 베팅 풀 및 파산 방지 룰 구현.
- Discord 채널 채팅 스팸 없이 단일 메시지 임베드를 3단계로 갱신하는 쾌적한 관전 UX 제공.

**Non-Goals:**
- 외부 가상화폐/현금성 도박 시스템 (오직 봇 내부 ELO 레이팅만 취급).
- Discord 내 웹소켓 실시간 스트리밍 (Discord Interaction REST API의 메시지 수정 기능 활용).

## Decisions

### 1. 시뮬레이션 일괄 계산 후 타임라인 반환 (`POST /api/fly/duel`)
- **결정**: 12라운드 시뮬레이션을 Discord와 턴마다 핑퐁 통신하지 않고, Python SNN 서버에서 전체 매치(12R × 2명)를 약 100~200ms 내에 일괄 시뮬레이션하여 타임라인 JSON(도파민 수치, 다이스, 점수, 리드체인지, 상황 대사)을 한 번에 반환.
- **이유**: Worker의 실행 시간(30초 내외) 및 Discord API Rate Limit(초당 5회)을 완벽히 준수하면서 네트워크 왕복 지연을 제거.
- **대안 고려**: 턴마다 실시간 REST 호출 ➔ 네트워크 오버헤드와 타임아웃 위험이 지나치게 큼.

### 2. 단일 메시지 임베드 3단계 하이라이트 중계 UX
- **결정**: 채널에 새 메시지를 여러 개 보내지 않고, 최초 `/colosseum` 메시지의 Embed를 `ctx.waitUntil`을 통해 3단계로 갱신:
  - **1단계 (T+0s)**: [베팅 마감 & 전반전(R1~R6) 요약] - 현재 선두, 도파민 게이지, 잭팟/폭망 대사
  - **2단계 (T+4s)**: [후반전(R7~R12) 격돌] - 역전 클라이맥스(LEAD CHANGE), 후반 족보 승부처
  - **3단계 (T+8s)**: [최종 판정 및 ELO 정산] - 승리 초파리 확정, 유저별 베팅 결과 및 변동 ELO 발표
- **이유**: 채널 알림 공해(스팸)를 방지하고, 모바일 및 PC 디스코드에서 한눈에 전황을 파악하기 가장 깔끔함.

### 3. ELO 기반 배당률(Odds) 공식 및 베팅 풀
- **결정**:
  - 각 페르소나의 기본 ELO 레이팅(Jackpot: 1250, Newton: 1200, Speeder: 1220, Chimera: 1280)을 부여.
  - Elo 기대 승률 공식 $E_A = \frac{1}{1 + 10^{(R_B - R_A)/400}}$에 따라 배당률 계산 (배당률 = $1 / E_A \times 0.95$ 수수료 마진 포함).
  - 유저 베팅은 1인당 최소 10 ~ 최대 50 ELO로 제한.
  - 보유 ELO 800 이하 유저는 베팅 불가 (새싹 유저 보호).

### 4. D1 데이터베이스 스키마 확장
- **결정**: 활성 콜로세움 매치와 유저 베팅 내역을 추적하기 위해 `colosseum_matches` 및 `colosseum_bets` 테이블 추가.
- **이유**: Worker가 비동기 갱신 중 크래시되더라도 베팅 내역이 유실되지 않고 정산 가능.

## Risks / Trade-offs

- **[Risk] SNN 서버 오프라인 또는 지연 발생**  
  ➔ **Mitigation**: `FLY_BRAIN_URL` 타임아웃(3초) 발생 시 즉시 에러 임베드로 전환하며 유저가 베팅한 ELO를 전액 환불(Rollback).
- **[Risk] 여러 유저의 동시 베팅 시 Race Condition**  
  ➔ **Mitigation**: D1 트랜잭션 또는 단일 베팅 풀 상태 업데이트를 통해 베팅 마감 플래그 이후의 입력은 안전하게 거절.
- **[Risk] Discord Rate Limit**  
  ➔ **Mitigation**: 1단계와 2단계, 3단계 간격에 3~4초 지연을 두어 Rate Limit 임계치(초당 5회)를 여유 있게 회피.
