## 1. KC-MBON 시냅스 가소성 엔진 구현

- [x] 1.1 KC->MBON 시냅스 가중치 추출, 가우시안 섭동(변이), 및 가중치 업데이트 함수 구현 (`experiments/flywire-poc/src/synaptic_plasticity.py`)
- [x] 1.2 시냅스 변이 시 PN->KC 및 APL 억제 가중치가 불변으로 유지되는지 검증하는 단위 테스트 작성 (`experiments/flywire-poc/tests/test_plasticity.py`)

## 2. 개체군 기반 초고속 신경진화 루프 구현

- [x] 2.1 세대별 개체군(Population) 생성, 토너먼트 선택, 엘리트 보존, 교배 및 변이 로직 구현 (`experiments/flywire-poc/src/evolution.py`)
- [x] 2.2 피트니스 함수(평균 점수 + 상단 보너스 가중치) 및 보상 조절(도파민 대박 vs 옥토파민 처벌) 편향 옵션 구현
- [x] 2.3 50개체 10세대 미니 진화 실행 테스트를 통해 평균 점수 상승 추세를 검증하는 테스트 작성 (`experiments/flywire-poc/tests/test_evolution.py`)

## 3. 다차원 토폴로지 비교 벤치마크 및 리포터

- [x] 3.1 실제 초파리 커넥톰 vs 무작위 Erdos-Renyi SNN vs 인공 MLP 3자 대조 벤치마크 러너 구현 (`experiments/flywire-poc/src/topology_benchmark.py`)
- [x] 3.2 최고 성과 챔피언 초파리의 의사결정 습관(선호 주사위 눈, 카테고리 선택 분포, 리스크 성향) 시각화 리포트 생성기 구현
- [x] 3.3 최적화된 초파리 뇌 가중치 파일(`data/champion_fly_weights.npz`) 저장 및 재현 검증
