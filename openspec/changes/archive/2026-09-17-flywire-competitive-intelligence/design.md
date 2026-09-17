## Context

Phase 3에서 100세대 진화를 통해 106점을 달성하고 인공 MLP를 압도했으나, 단일 솔리테어 환경 및 고정된 APL 억제(-0.6)로 인해 조합 추론과 장기 족보 집행에 한계가 있었습니다.
본 설계는 사용자 요청에 따라 (1) 1:1 PvP 대전과 승패 기반 도파민 공진화, (2) APL 동적 억제 조절, (3) 단기 작업기억(Working Memory), (4) 뉴런 수 스케일링을 하나의 통합 인지 아키텍처로 구현합니다.

## Goals / Non-Goals

**Goals:**
- 2인용 1:1 대전 엔진 및 Elo 레이팅 추적 시스템 구현 (`pvp_duel.py`).
- 1:1 승자에게 대량 도파민 보상을 지급하는 경쟁 공진화(Competitive Co-evolution) 루프 구축.
- 롤링 단계에 따른 APL 억제 동적 완화(Dynamic Gating) 구현 (`advanced_cognition.py`).
- 이전 롤링 상태를 기억하는 순환 작업기억(Recurrent Working Memory) 연결.
- KC 뉴런 수 스케일링(1,500 vs 3,000) 비교 실험 및 영향 분석.
- 턴별 극적인 역전승 명경기 로그(Dramatic Match Highlight) 추출 및 시각화.

**Non-Goals:**
- Discord 웹소켓 라이브 브릿지 (본 단계는 로컬 고속 1:1 시뮬레이션에 집중).

## Decisions

### 1. 1:1 PvP 대전 및 승패 도파민 보상 메커니즘
- **결정**: 두 에이전트가 12라운드 동안 번갈아가며 주사위를 굴리고 채점.
- **도파민 승자 보상**: 승자에게 $Fitness = Score + 50.0 + \max(0, Score_{winner} - Score_{loser})$, 패자에게는 $Fitness = Score - 20.0$.
- **효과**: 정적인 점수판과의 싸움이 아닌, 상대를 꺾기 위해 공격적으로 대박 족보를 사냥하는 경쟁적 군비 경쟁(Arms Race) 유도.

### 2. APL 동적 게이팅 (Dynamic Attention)
- **1차 롤링**: APL 가중치 -0.6 (초기 탐색 및 노이즈 억제).
- **2·3차 롤링**: APL 가중치를 -0.15로 동적 완화 (케년 세포의 다중 일치 발화를 허용하여 조합 추론 대역폭 확장).

### 3. 단기 작업기억 (Working Memory Recurrence)
- 1차 롤링에서 선택한 목표 카테고리 / 주사위 특징을 4-dim 컨텍스트 벡터로 보존하여 다음 롤링 시 PN 45..49에 피드백 주입.

## Risks / Trade-offs

- **[공진화 중 한쪽으로 쏠림 (Red Queen Effect)]** → 한 에이전트가 우연히 이겨 독점할 위험. 해결책: 이전 세대 챔피언들의 명예의 전당(Hall of Fame)을 구성하여 과거 챔피언들과도 대결하게 함으로써 견고한 전략 유지.
