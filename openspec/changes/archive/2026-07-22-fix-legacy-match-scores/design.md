## Context

7월 15일 및 리팩토링 이전 일부 매치 레코드에서 `player2_score`가 `player1_score`와 동일한 값으로 저장되어 무승부처럼 보이는 데이터 불일치가 발생했습니다. 매치 상세 복기용 `historyJson`에는 각 턴별 플레이어 기입 점수가 정확히 남아 있으므로, 이를 파싱하여 DB 레코드를 복원할 수 있습니다.

## Goals / Non-Goals

**Goals:**
- D1 `matches` 테이블 내 과거 매치들의 `historyJson` 파싱.
- `historyJson` 기반 실제 총점 산출: `actualP1 = sum(p1_scores)`, `actualP2 = sum(p2_scores)`.
- DB 레코드의 `player1_score`, `player2_score`와 불일치 시 `UPDATE matches SET player1_score = ?, player2_score = ?, winner_id = ? WHERE id = ?` 실행.
- `--remote` 옵션을 통한 Cloudflare D1 Production DB 데이터 안전 업데이트.

**Non-Goals:**
- 정상 기록된 최신 경기 레코드 수정.
- 플레이어 누적 전적(`players` 테이블)의 강제 재계산 (최근 경기 복기 및 매치 레코드 정정 중심).

## Decisions

### 1. 마이그레이션 판별 로직
- `historyJson` 배열 내 `playerIndex === 0` 의 `score` 합 = `actualP1`
- `playerIndex === 1` 의 `score` 합 = `actualP2`
- `actualP1` vs `actualP2` 비교를 통한 `winnerId` 계산 (`p1 > p2 ? p1Id : (p2 > p1 ? p2Id : null)`)
- `player1_score !== actualP1` 또는 `player2_score !== actualP2` 인 건만 추출하여 SQL UPDATE 구문 생성 및 실행.
