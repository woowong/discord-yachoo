## Context

최근 릴리즈된 ELO Rating, Surrender 기능, 모바일 화면 최적화 등의 신규 스펙들이 실제 게임 동작에는 반영되었으나 사용자용 가이드 문서(README.md, FAQ.md) 및 개발자 문서(ARCHITECTURE.md)에 전혀 반영되지 않아 문서의 정합성이 맞지 않는 상태입니다.

## Goals / Non-Goals

**Goals:**
* 사용자 문서인 `README.md` 및 `README.ko.md`에 ELO Rating 시스템, 항복 기능, 모바일 최적화 스코어보드 등 최근 변경 사항을 누락 없이 반영합니다.
* 개발자 아키텍처 정보인 `ARCHITECTURE.md`에 새롭게 도입된 ELO 계산 도메인 및 Effect.ts 로깅(Log Annotations) 시스템을 추가합니다.
* `FAQ.md` 및 `FAQ.ko.md`에 오작동 방지(전체 홀드 시 롤링 불가), 본인 결투 방지, ELO 레이팅 기반 매치 및 리더보드 정렬, 운영용 복구 스크립트 실행 방법에 대한 문답을 보충합니다.

**Non-Goals:**
* 게임 도메인 로직이나 인프라 코드의 물리적인 수정. (이번 변경은 순수 마크다운 문서 현행화에만 집중함)

## Decisions

* **수정 파일 및 위치**:
  * **README.md / README.ko.md**: Key Features 섹션에 ELO 레이팅, 기권 기능, 모바일 화면 최적화를 추가 기술.
  * **ARCHITECTURE.md**: "Core Technologies & Paradigms" 목록에 "Operational Audit Logging" 및 "ELO Rating System" 추가.
  * **FAQ.md / FAQ.ko.md**: 카테고리에 맞는 질문과 답변을 추가하되, 기존 FAQ 스타일(OpenSpec 파일 참조 링크 포함)에 맞추어 작성.

## Risks / Trade-offs

* **[Risk] 문서 작성 중 정보 불일치**: 스펙의 사양이 모호하게 서술되어 실제 제품 동작과 다르게 기재될 수 있음.
  * **[Mitigation]**: 최근 머지된 openspec specs(`yacht-state-machine/spec.md`, `elo-rating/spec.md` 등)에 기술된 구체적 사나리오 규칙을 일치시켜서 FAQ에 명시.
