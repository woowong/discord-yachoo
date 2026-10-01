
가능하다. 다만 “초파리 커넥톰을 그대로 넣으면 Yacht를 플레이한다”는 의미는 아니고, 커넥톰을 의사결정 회로의 골격으로 사용해서 저지능 봇을 만드는 것이 현실적이다.

핵심은 Yacht를 초파리에게 가르치는 게 아니라, Yacht의 상태를 초파리의 감각 자극으로 번역하고, 초파리 뇌의 출력 뉴런을 행동 버튼에 매핑하는 것이다.

구조

Yacht 게임
   │
   │ 현재 상태
   ▼
┌─────────────────────┐
│ sensory encoder     │
│                     │
│ 주사위 1 = 3        │
│ 주사위 2 = 6        │
│ 남은 카테고리 = ... │
│ 현재 점수 = ...     │
└─────────┬───────────┘
          │ spike
          ▼
┌─────────────────────┐
│ Drosophila connectome│
│                     │
│  sensory neurons    │
│       ↓             │
│  interneurons       │
│       ↓             │
│  decision circuits  │
│       ↓             │
│  motor neurons      │
└─────────┬───────────┘
          │
          ▼
    행동 확률
          
  reroll dice 1
  reroll dice 2
  reroll dice 3
  ...
  score YACHT
  score FULL HOUSE
  ...

그런데 여기서 중요한 문제가 하나 있다

커넥톰은 “프로그램”이 아니다.

FlyWire 같은 커넥톰에는 대략

Neuron A ──→ Neuron B
      ├────→ Neuron C
      └────→ Neuron D

라는 연결 구조가 있다.

하지만 이것만으로는

“3, 3, 4, 5, 6이면 풀하우스를 노려라”

라는 규칙이 자동으로 나오지 않는다.

그래서 초파리 커넥톰 + 학습이 필요하다.

⸻

재미있는 구현 방법

나는 강화학습을 아주 조금만 넣는 방식을 추천한다.

각 게임 턴을:

관찰 → 생각 → 행동 → 보상

으로 만든다.

예를 들어:

주사위:
[3, 3, 4, 5, 6]
가능한 행동:
A. 3 유지
B. 4 유지
C. 5 유지
D. 6 유지
E. 전부 다시 굴리기
...

커넥톰 기반 SNN이 spike를 발생시키고:

motor neuron 1 → dice #1 reroll
motor neuron 2 → dice #2 reroll
motor neuron 3 → dice #3 reroll
...
motor neuron 6 → dice #6 reroll
motor neuron 7 → category: FOUR
motor neuron 8 → category: FULL HOUSE
...

처럼 연결한다.

그리고 게임 결과에 따라:

좋은 결과 → synaptic weight ↑
나쁜 결과 → synaptic weight ↓

를 아주 단순하게 적용한다.

그러면 봇이 수백~수천 판을 플레이하면서 자기 나름의 이상한 Yacht 전략을 만들어낼 수 있다.

⸻

더 재미있는 부분: 일부러 “저지능”으로 만들기

일반적인 RL agent처럼 만들면 재미가 없어진다.

예를 들어 봇에게:

* 다음 주사위 결과를 알 수 없음
* 가능한 모든 경우의 수 계산 금지
* 깊은 search 금지
* LLM 금지
* 정확한 Yacht 전략 제공 금지

를 걸어버린다.

대신 커넥톰에서 발생하는 activity만 보고 결정한다.

그러면 이런 결과가 나올 수 있다.

🪰 Fly #17
dice: 2 2 3 5 6
brain:
  visual neurons       ███████
  reward neurons       ████
  exploration          █████████
  motor: reroll 5      ████████
→ reroll 5

그리고

dice: 2 2 3 5 6
brain:
  exploration          ██████████
  exploitation         ██
→ 갑자기 2도 다시 굴림

같은 비합리적인 행동도 나온다.

그게 오히려 실험적으로 재미있다.

⸻

그런데 “실제 초파리 커넥톰”을 쓰는 이유가 있나?

여기서 상당히 재미있는 연구 질문이 생긴다.

A. 랜덤 네트워크

Yacht → 랜덤 neural network → 행동

B. 일반 SNN

Yacht → 1,000-neuron SNN → 행동

C. 초파리 커넥톰

Yacht → Fly connectome → 행동

셋을 같은 조건에서 학습시키는 거다.

그리고

평균 점수
학습 속도
탐험/착취 비율
행동 다양성
특정 전략의 형성

을 비교한다.

이렇게 하면 단순한 장난을 넘어서

“생물학적 neural wiring이 일반적인 artificial network보다 제한된 자원에서 의사결정에 어떤 특성을 만들어내는가?”

라는 꽤 괜찮은 실험이 된다.

⸻

M4 Air 32GB에서는?

이 정도는 충분히 가능하다.

처음부터 139k 뉴런 전체를 사용할 필요도 없다.

오히려:

FlyWire
 ↓
의사결정과 관련된 circuit 일부 추출
 ↓
수천 뉴런
 ↓
LIF
 ↓
Yacht encoder
 ↓
motor neurons

로 시작하는 게 좋다.

그리고 마지막에 13만 뉴런 전체 connectome으로 바꿔서 결과가 달라지는지 비교할 수 있다.

난이도를 나누면

버전	내용	M4 Air
v0	가짜 초파리 100뉴런	매우 쉬움
v1	실제 connectome 일부	충분
v2	수천 뉴런 SNN + 학습	충분
v3	전체 139k 뉴런	가능성 높음
v4	전체 connectome + 복잡한 neuron model	상당히 무거움

특히 v1~v2가 프로젝트의 핵심이다.

그리고 Yacht는 게임 상태 공간이 작아서 좋은 테스트베드다. Chess/Go처럼 거대한 탐색 공간이 아니라서 **“생물학적 회로가 제한된 정보와 기억만으로 얼마나 그럴듯한 의사결정을 만들어내는가”**를 관찰하기 좋다.

한 단계 더 재미있게 만들면 Discord에서 사람들이 실제로 이 초파리와 Yacht를 두고 대결할 수도 있다.
!yacht → 초파리 뇌가 주사위를 보고 실제 행동을 결정 → 사람과 점수 비교.

이건 네가 말한 “Discord에 반응하는 초파리뇌” 아이디어와도 자연스럽게 합쳐진다.
