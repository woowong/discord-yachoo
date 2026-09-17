## 1. 감각 행위유발성 인코더 및 고차 롤링 디코더 구현

- [x] 1.1 PN 33..44에 잠재 득점 강도($Points / 50.0 \times 2.0$)를 주입하는 Affordance 인코더 구현 (`experiments/flywire-poc/src/encoder.py`)
- [x] 1.2 투 페어 보존 및 포카드 락 인을 지원하는 고차 롤링 디코더 및 0점 함정 방지 로직 구현 (`experiments/flywire-poc/src/decoder.py`)
- [x] 1.3 Affordance 인코딩 및 0점 방지 필터링 동작을 검증하는 단위 테스트 작성 (`experiments/flywire-poc/tests/test_affordance.py`)

## 2. 다대륙 섬 모델(Island Model) 신경진화 엔진 구현

- [x] 2.1 4개 독립 섬(Island) 생성, 섬별 특화 피트니스, 정체 시 초돌연변이 로직 구현 (`experiments/flywire-poc/src/island_evolution.py`)
- [x] 2.2 주기적(20세대) 대륙 간 챔피언 이주 및 하이브리드 교배(Migration & Crossover) 구현
- [x] 2.3 다대륙 섬 모델 기본 동작 및 이주 주기 검증 단위 테스트 작성 (`experiments/flywire-poc/tests/test_island_evolution.py`)

## 3. 대규모 150세대 진화 실행 및 200점 돌파 실측 리포트

- [x] 3.1 150세대 섬 모델 진화 실행 및 최고 챔피언 가중치(`data/super_champion_fly.npz`) 저장 스크립트 작성 (`experiments/flywire-poc/src/run_island_experiment.py`)
- [x] 3.2 50게임 정밀 벤치마크 수행 (평균 120~150점+ 달성 및 최고점 180~200점 돌파 실측)
- [x] 3.3 실측 데이터 기반 노션 종합보고서 업데이트 및 공유
