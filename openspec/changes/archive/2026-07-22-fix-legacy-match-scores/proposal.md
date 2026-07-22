## Why

과거 7/15 이전 버전의 버그로 인해 매치 기록이 저장될 때 `player2_score`가 `player1_score` 값으로 잘못 기록된 일부 매치 레코드(예: `6mfrrgl`)가 D1 DB에 존재합니다. 이를 `historyJson`에 남아 있는 정확한 플레이어별 12R 턴별 점수 기록을 기반으로 올바른 점수 및 `winner_id`로 소급 보정(One-time Migration)하여 데이터의 완전성(Single Source of Truth)을 확보합니다.

## What Changes

1. **DB 마이그레이션 스크립트 구축 (`scripts/fix-legacy-match-scores.ts`)**:
   - D1 `matches` 테이블에서 `historyJson`이 존재하는 멀티플레이어 매치를 전수 조사.
   - `historyJson` 내 Player 1 및 Player 2의 실제 턴 점수 합산과 DB의 `player1_score`, `player2_score`를 비교.
   - 불일치가 발견된 경기에 대해 `player1_score`, `player2_score`, `winner_id`를 재산출하여 업데이트하는 안전한 배치 쿼리 실행.

## Capabilities

### Modified Capabilities

- `d1-database-schema`: 손상된 과거 매치 스코어 데이터 정정 마이그레이션 적용.

## Impact

- D1 Database `matches` 레코드 정정.
- 대시보드 최근 경기 목록, 승률, 평균 점수 및 복기 모달의 스코어 완전 일치 확보.
