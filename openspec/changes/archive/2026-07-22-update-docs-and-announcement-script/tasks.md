## 1. 레포지토리 사용자 문서 최신화 (Documentation Update)

- [x] 1.1 `README.ko.md` 수정: 5분 초대전, 오픈 매치메이킹, 2단계 항복 제안, 웹 대시보드 리플레이 스코어 차이(Score Diff) 열 및 신규 슬래시 명령어 반영
- [x] 1.2 `README.md` 수정: 영문 README에 동일 항목 반영 및 최신화
- [x] 1.3 `FAQ.ko.md` 수정: 기존 항복 FAQ를 2단계 항복 제안 흐름으로 수정하고, 5분 초대전 만료 및 오픈 매치메이킹(`/yachoo match`) 신규 FAQ 작성
- [x] 1.4 `FAQ.md` 수정: 영문 FAQ에도 항복 제안, 5분 초대전, 매치메이킹 큐 FAQ 업데이트

## 2. 공지 발송 CLI 스크립트 작성 (Announcement Script)

- [x] 2.1 `scripts/send-announcement.ts` 신규 작성: `DISCORD_TOKEN`, 채널 ID, `--dry-run` 플래그 및 패치 노트 Embed Payload 발송 로직 구현
- [x] 2.2 `package.json`에 `"announce": "tsx scripts/send-announcement.ts"` 스크립트 등록
- [x] 2.3 스크립트 dry-run 테스트 수행: `npm run announce -- <CHANNEL_ID> --dry-run`으로 패치 노출 검증

## 3. 검증 및 준비 (Verification & Setup)

- [x] 3.1 `npm run test` 및 `npx openspec validate`로 검증 수행
- [x] 3.2 디스코드 패치 노트 전송 준비 완료 및 사용 안내 제공
