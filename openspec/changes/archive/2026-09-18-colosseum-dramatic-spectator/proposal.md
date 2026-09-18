## Why

기존 초파리 콜로세움(/colosseum) 결투는 단 2단계(R06 전반, R12 후반)로만 요약되고 총 6초 만에 순식간에 종료되어 관전의 긴장감과 몰입도가 떨어졌습니다. 또한 일반 유저 게임처럼 전체 점수판(ASCII 카테고리 현황표)이나 주사위 롤(Roll 1/2/3) 킵 과정이 보이지 않았고, 대사 또한 정적이고 점잖아 초파리 검투사 아레나 특유의 B급 도파민 감성이 부족했습니다.
이를 개선하여 일반 사용자 게임과 동일한 퀄리티의 전체 점수판과 주사위 롤링 애니메이션/히스토리를 제공하고, 턴별 긴장감 넘치는 지연 시간과 B급/키치한 인터넷 밈 대사를 적용합니다.

## What Changes

- **초파리 결투 롤별/점수판 히스토리 기록 (Python SNN)**:
  - `simulate_colosseum_duel`에서 각 라운드별 단순 최종 결과뿐만 아니라, 턴당 최대 3회의 주사위 롤(주사위 눈, 킵 여부) 및 누적 점수판(scoreBoard) 상태를 기록하여 반환.
- **초파리 페르소나 키치/B급 밈 대사 전면 개편**:
  - 4종 페르소나(잭팟, 뉴턴, 스피더, 키메라)의 대사를 인터넷 도박/야추 밈, 자폭, 티배깅, 도파민 풀악셀 등 극적이고 키치한 스타일로 전면 교체.
- **콜로세움 관전 연출 세분화 & 스펙터클 지연**:
  - 단 2단계 점프 대신 6개 주요 격돌 챕터(오프닝 R1-2, 상단전 R3-4, 중반 난타전 R5-6, 보너스 레이스 R7-8, 클러치 야추 타임 R9-10, 최종 승부 R11-12)와 턴별 딜레이(2.5초 내외)를 주어 관전자가 전황을 따라가며 손에 땀을 쥐도록 연출.
- **일반 게임 수준의 전체 ASCII 점수판 및 주사위 락 표시**:
  - 임베드 내에 일반 게임과 동일한 카테고리별 양측 점수표(Aces ~ Yacht, Subtotal, Bonus, Total)와 현재 롤 주사위 이모지 및 락(`🔒 ▫️`) 그래픽을 실시간 렌더링.

## Capabilities

### Modified Capabilities
- `fly-colosseum-betting`: 관전 임베드에 일반 게임형 전체 점수판 및 주사위 락 상태 렌더링, 6단계 전황 챕터 연출, 키치한 밈 대사 지원 추가.
- `flywire-pvp-duel`: 결투 시뮬레이션 응답에 롤별 주사위/킵 히스토리 및 라운드별 점수판 스냅샷 필드 추가.

## Impact

- `experiments/flywire-poc/src/personas.py`: `simulate_colosseum_duel` 롤 히스토리 수집 및 `_generate_dialogue` 키치 멘트 개편.
- `experiments/flywire-poc/src/web_server.py`: duel 응답 스키마 확장.
- `src/presentation/discord/adapter/serializer.ts`: `serializeColosseumClash`에 전체 ASCII 점수판 및 주사위 이모지 렌더링 추가.
- `src/application/GameWorkflowService.ts`: `executeColosseumMatchLogic`를 6단계 챕터별 점진적 갱신(총 15~18초 지연) 구조로 확장.
