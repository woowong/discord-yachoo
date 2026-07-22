## Context

웹 대시보드의 복기 모달 헤더에는 `점수 격차 (Δ)` 컬럼이 추가되었으나, `dashboardHtml.ts`의 `openReplay` 메서드 내 JavaScript 템플릿 스트링 반환 로직에서 `diffHtml` 변수를 생성해놓고 정작 `<td>${diffHtml}</td>`를 누락하여 표의 7번째 셀이 비어 보이는 현상이 발견되었습니다.

## Goals / Non-Goals

**Goals:**
- `dashboardHtml.ts`에서 `openReplay` 턴 목록 렌더링 시 7번째 컬럼으로 `<td>${diffHtml}</td>`를 포함시킨다.
- 로딩 상태 및 에러 발생 시 `colspan="6"`을 `colspan="7"`로 변경하여 7개 컬럼에 맞추어 중앙 정렬되도록 수정한다.

**Non-Goals:**
- 점수 격차 계산 공식이나 ELO 및 기타 복기 로직 변경.

## Decisions

### 1. `dashboardHtml.ts` 턴 테이블 렌더링修正
- `openReplay` 함수 내 `return \`<tr style="${rowBg}">...\` 템플릿 스트링 마지막에 `<td>${diffHtml}</td>` 추가.
- `tbody.innerHTML`의 로딩/에러 `<tr><td colspan="7">` 컬럼 수 통일.
