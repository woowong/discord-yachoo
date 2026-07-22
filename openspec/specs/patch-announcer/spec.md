# patch-announcer Specification

## Purpose
새로운 게임 패치 노트를 디스코드 채널로 브로드캐스트 전송하는 CLI 아나운서 스크립트를 제공한다.
## Requirements
### Requirement: Discord Patch Announcement Script
The system SHALL provide a CLI script (`scripts/send-announcement.ts`) that broadcasts formatted game patch notes to a specified Discord channel using the bot token.

#### Scenario: Successful dry-run announcement
- **WHEN** user executes `npx tsx scripts/send-announcement.ts <CHANNEL_ID> --dry-run`
- **THEN** system prints the structured patch note message and embed payload to stdout without sending any HTTP API request

#### Scenario: Successful message broadcast via Discord REST API
- **WHEN** user executes `DISCORD_TOKEN="<VALID_TOKEN>" npx tsx scripts/send-announcement.ts <CHANNEL_ID>`
- **THEN** system sends a POST request to `https://discord.com/api/v10/channels/<CHANNEL_ID>/messages` with the patch note embed payload and outputs success message with returned Message ID

#### Scenario: Missing Discord Bot Token
- **WHEN** user executes `npx tsx scripts/send-announcement.ts <CHANNEL_ID>` without `DISCORD_TOKEN` environment variable
- **THEN** system exits with code 1 and outputs an error message explaining that `DISCORD_TOKEN` is required

