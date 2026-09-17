## 1. 1:1 PvP 대전 엔진 및 승패 도파민 공진화 구현

- [x] 1.1 초파리 2마리 1:1 대전 시뮬레이터 및 Elo 레이팅 계산 모듈 구현 (`experiments/flywire-poc/src/pvp_duel.py`)
- [x] 1.2 승자 도파민 보너스 및 패자 옥토파민 감점을 적용한 PvP 토너먼트 공진화 루프 구현
- [x] 1.3 1:1 대전 동작 및 승자 판정 검증 단위 테스트 작성 (`experiments/flywire-poc/tests/test_pvp.py`)

## 2. APL 동적 억제 및 단기 작업기억 인지 모듈 구현

- [x] 2.1 롤링 단계별 APL 억제 강도 동적 게이팅 구현 (`experiments/flywire-poc/src/advanced_cognition.py`)
- [x] 2.2 롤링 간 전략적 목표를 유지하는 순환 작업기억(Working Memory) 피드백 구현
- [x] 2.3 동적 게이팅과 작업기억 결합 시 단일 턴 일관성을 검증하는 테스트 작성 (`experiments/flywire-poc/tests/test_advanced_cognition.py`)

## 3. 대규모 실험 실행 및 명경기 리포트 생성

- [x] 3.1 1,500 KC vs 3,000 KC 뉴런 스케일링 비교 벤치마크 러너 구현 (`experiments/flywire-poc/src/run_pvp_experiments.py`)
- [x] 3.2 50세대 PvP 공진화 실행 및 명예의 전당(Hall of Fame) 챔피언 선발
- [x] 3.3 기적의 역전승 명경기 턴별 중계 로그 추출 및 노션 리포트 업데이트
