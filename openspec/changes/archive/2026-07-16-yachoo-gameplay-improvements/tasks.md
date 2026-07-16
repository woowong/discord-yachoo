## 1. Database 및 Persistence 레이어 변경

- [x] 1.1 D1 데이터베이스 `active_games`에서 Finished 게임 삭제를 위한 마이그레이션 파일 `migrations/0007_cleanup_finished_active_games.sql` 생성
- [x] 1.2 `GameRepository` 인터페이스 및 D1 구현체(`D1GameRepositoryLive`)에 `delete` 메소드 추가
- [x] 1.3 `GameRepository` 인터페이스 및 D1 구현체에 두 플레이어 간의 활성 게임(InProgress)이 있는지 조회하는 `findActiveGameByPlayers` 메소드 구현

## 2. 도메인 및 UI 직관성 개선 (Serializer)

- [x] 2.1 `serializer.ts:formatScoreBoard` 수정: 서브토탈, 보너스 위아래에 `==========================` 형태의 고정 수평선 적용
- [x] 2.2 `serializer.ts:serializeGame` 수정: 기권 버튼을 라벨 없이 이모지 `🏳️`만 가진 형태로 축소
- [x] 2.3 `serializer.ts:serializeGame` 수정: 주사위 홀드 버튼 너비가 고정되도록 일반 상태 `[1]`과 Held 상태 `🔒` 라벨로 맵핑

## 3. 기권 및 매칭 오케스트레이션 로직 변경 (Interaction Handler)

- [x] 3.1 `index.ts` 수정: `/challenge` 처리 시 `findActiveGameByPlayers`를 호출하여 중복 대전이 있는지 확인하고, 에페메랄 메시지로 기존 게임 포워딩 링크(initialMessageId 이용) 응답 로직 구현
- [x] 3.2 `index.ts` 수정: 최초 대전 생성 메시지 ID를 `@original` interaction get을 통해 확보하여 `GameState` 내 `initialMessageId`에 기록 및 저장
- [x] 3.3 `index.ts` 수정: 기권 버튼(`surrender`) 클릭 시 즉시 기권 처리하는 대신, 에페메랄 확인용 메시지와 confirm 버튼을 전송하도록 분기 추가
- [x] 3.4 `index.ts` 수정: 기권 확인 버튼(`confirm_surrender`) 클릭 시 실제 `surrenderGame`을 실행하고, 해당 게임을 `active_games`에서 삭제(DELETE)하도록 구현
- [x] 3.5 `index.ts` 수정: 일반 게임 완료(Finished) 시에도 해당 게임 세션을 `active_games`에서 `delete`하도록 처리

## 4. 어그로 및 놀림 알림 메시지 발송 시스템

- [x] 4.1 `index.ts` 수정: 카테고리 선택 및 턴 종료 시 Yacht 달성, 야추 헛박제(포기 상태에서 달성), 낮은 점수 확정, 연속 0점 기록, 최종 꼴찌 이벤트를 감지하는 판별 로직 추가
- [x] 4.2 `index.ts` 수정: DC/FM 스타일의 남초 커뮤니티 밈 어조를 가진 메시지 풀 상수 정의
- [x] 4.3 `index.ts` 수정: 판별된 이벤트에 따라 `DiscordApiService`를 통해 독립적인 알림 메시지를 채널에 발송하도록 구현

## 5. 테스트 코드 작성 및 검증

- [x] 5.1 중복 대전 제한 로직에 대한 단위 테스트(`index.test.ts` 혹은 `game.test.ts`) 작성 및 리포지토리 모크 테스트 추가
- [x] 5.2 Yacht 달성/실패 및 연속 0점, 낮은 점수, 최종 꼴찌 놀림 트리거 로직에 대한 단위 테스트 작성
