## 1. Database Migration & Schema Update

- [x] 1.1 신규 D1 마이그레이션 파일 `migrations/0009_add_elo_history_to_matches.sql` 생성 및 ALTER TABLE 문장 기입.
- [x] 1.2 로컬 D1 데이터베이스에 마이그레이션 적용 및 검증.

## 2. Core Domain & Repository Updates

- [x] 2.1 `src/persistence/repository.ts` 파일의 `MatchRecord` 인터페이스에 `player1EloAfter`, `player2EloAfter` 필드 추가.
- [x] 2.2 `src/persistence/d1/repository.ts` 내 `mapRowToMatchRecord` 및 `saveMatch` 메서드를 수정하여 ELO 컬럼 입출력 처리.
- [x] 2.3 `src/persistence/d1/repository.ts` 내 `getRecentMatches`에서 `guildId`가 `null`일 경우 `guild_id IS NULL` 조건 필터를 건너뛰고 전체 데이터를 조회하도록 수정.
- [x] 2.4 `src/persistence/d1/repository.ts` 내 `getPlayerAverageScore`에서 `guildId`가 `null`일 경우 `guild_id IS NULL` 조건 필터를 건너뛰도록 수정.

## 3. Game Workflow Service Refactoring

- [x] 3.1 `src/application/GameWorkflowService.ts` 의 `endGame` 로직에서 ELO 변동 점수를 `saveMatch` 이전에 계산하고 `MatchRecord`에 바인딩하도록 로직 순서 변경.
- [x] 3.2 `src/application/GameWorkflowService.ts` 의 `surrenderGame` 로직에서 ELO 변동 점수를 `saveMatch` 이전에 계산하고 `MatchRecord`에 바인딩하도록 로직 순서 변경.

## 4. Web Presentation Layer Improvements

- [x] 4.1 `src/presentation/web/dashboardHtml.ts` 내 복기 모달 테이블 마크업에 "누적 점수" 헤더 컬럼 추가 및 컬럼 간 폭 조율.
- [x] 4.2 복기 모달의 `openReplay` 자바스크립트 함수 내 플레이어별 누적 점수 추적 로직 구현.
- [x] 4.3 복기 모달 테이블 행에 플레이어별 고유 행 배경색 구분 및 이름 옆 도트 아이콘 추가 (Blue/Green 테마 적용).
- [x] 4.4 복기 턴별 획득 점수에 대해 점수 범위별 하이라이트 CSS 스타일 및 글로우 효과 추가.
- [x] 4.5 복기 닉네임 클릭 핸들러에 `switchTab('profile-tab')`을 삽입하여 프로필 탭 강제 전환 및 프로필 로드 정상화.
- [x] 4.6 `dashboardHtml.ts` 의 `<head>`에 `Chart.js` CDN 스크립트 태그 포함.
- [x] 4.7 프로필 영역에 ELO 차트용 Canvas 컨테이너 카드 추가 및 CSS 레이아웃 정렬.
- [x] 4.8 `searchProfile` 콜백에서 플레이어 전적 응답을 파싱하여 `renderEloChart(history)`를 트리거하는 클라이언트 스크립트 구현.

## 5. Verification & Testing

- [x] 5.1 `npm run test`를 실행하여 기존 데이터베이스/게임 워크플로우 통합 테스트가 정상 패스하는지 확인.
- [x] 5.2 `src/persistence/d1.test.ts`에 `guildId = null`인 상태에서 `getRecentMatches` 및 `getPlayerAverageScore`가 전체 데이터 대상으로 동작하는지 검증하는 테스트 코드 추가.
- [x] 5.3 로컬 개발 서버(`npm run dev`)를 띄워 수정한 대시보드 화면에 접속하고, 닉네임 이동 링크 및 ELO 차트 렌더링, 모달 UI 고도화 내용을 직접 시각적으로 검증.
