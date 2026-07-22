## Why

웹 대시보드 턴 복기 모달에서 7번째 컬럼 헤더(`점수 격차 (Δ)`)는 존재하지만, 각 턴 행(`<tr>`)을 생성하는 렌더링 코드에서 `<td>${diffHtml}</td>` 셀 및 로딩/에러 테이블 `colspan` 값이 누락되어 점수 격차가 빈 칸으로 표시되는 버그가 발생했습니다. 이를 수정하여 정상적으로 점수 격차 및 (우세/열세/동점) 라벨이 출력되도록 처리합니다.

## What Changes

1. **`src/presentation/web/dashboardHtml.ts` 수정**:
   - `openReplay` 턴 목록 `<tr>` 템플릿에 `<td>${diffHtml}</td>` 셀 렌더링 추가.
   - 로딩 스피너 및 에러 메시지 렌더링 시 테이블 `colspan`을 `6`에서 `7`로 업데이트.

## Capabilities

### Modified Capabilities

- `web-dashboard`: 복기 모달 테이블 점수 격차 셀 렌더링 누락 수정.

## Impact

- `src/presentation/web/dashboardHtml.ts`: 턴 복기 모달 UI 출력 로직 수정.
