## Why

최근 2026-07-13에 ELO 레이팅, 기권(Surrender) 기능, 모바일 스코어보드 최적화, 주사위 롤링 오류 차단, 운영 패치 스크립트 등 대규모 기능 개선 및 편의성 기능이 구현되었습니다.
이에 따라 프로젝트의 대고객 문서인 README.md, README.ko.md, ARCHITECTURE.md, FAQ.md, FAQ.ko.md가 실제 시스템 스펙과 괴리가 발생하여, 이를 최신 스펙 사양에 맞춰 일괄 동기화 및 현행화하고자 합니다.

## What Changes

* **README.md & README.ko.md**:
  * 주요 특징(Key Features)에 ELO 레이팅, 기권 기능, 모바일 화면 최적화, 오작동 방지 기능 명시.
  * 명령어 설명 부분에 본인 결투 차단 및 ELO 기반 리더보드/프로필 기능 보강.
* **ARCHITECTURE.md**:
  * 기술 스택/패러다임 섹션에 ELO 레이팅 도메인 및 Effect.ts 기반 운영 감사 로깅(Log Annotations) 추가.
* **FAQ.md & FAQ.ko.md**:
  * 전체 주사위 홀드 시 롤 비활성화, 기권 처리 로직, 본인 결투 차단 정책, 모바일 스코어보드 최적화 및 상단 보너스 달성 표시, ELO 기반 순위 정렬 기준, 운영 강제 종료 스크립트에 관한 Q&A 내용 추가.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
<!-- None. Spec-level requirements have already been updated and merged in previous commits; this change only synchronizes the user-facing documentation with those existing specs. -->

## Impact

사용자 및 개발자 문서(README, ARCHITECTURE, FAQ)에 최신 기능들이 정확하게 기술되어 문서 신뢰성이 회복됩니다.
실제 시스템 동작에 영향을 주는 코드 변경은 없습니다.
