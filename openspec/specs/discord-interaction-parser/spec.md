# discord-interaction-parser Specification

## Purpose
디스코드 Interaction 요청 데이터를 해석하여 순수 비즈니스 로직(도메인 액션)으로 매핑하고, 게임의 상태나 결과를 다시 디스코드 메시지 양식(embeds, components)에 최적화된 JSON 구조로 직렬화합니다.
## Requirements
### Requirement: Discord Interaction Request Parsing
The system SHALL parse incoming JSON bodies into type-safe structures mapping to Discord Interaction Types (PING, ApplicationCommand, MessageComponent) and extract interaction metadata.

#### Scenario: Parse PING (Type 1)
- **WHEN** the raw JSON contains `type: 1`
- **THEN** the parser SHALL return a PING interaction type.

#### Scenario: Parse Slash Command (Type 2)
- **WHEN** the raw JSON contains `type: 2` and data name `/challenge` with options containing player info
- **THEN** the parser SHALL extract the command name, arguments, application_id, and token into a domain action.

#### Scenario: Parse Message Component (Type 3)
- **WHEN** the raw JSON contains `type: 3` and component custom_id `roll_dice`
- **THEN** the parser SHALL parse it as a roll request domain action and extract the application_id and token.

### Requirement: Discord Response Serialization
The system SHALL serialize game states, leaderboards, and error states into Discord Message Component format (JSON) featuring rich embeds and interactive button components.

#### Scenario: Serialize Yacht Game Board State
- **WHEN** serializing a running Yacht GameState
- **THEN** the response payload MUST contain a detailed Embed representing the scoreboards and a component structure consisting of dice hold buttons and turn action buttons (roll, score selection).

#### Scenario: Serialize Leaderboard Embed
- **WHEN** serializing a leaderboard list of top players
- **THEN** the response payload MUST contain an Embed with formatted rank, name, wins, and highest score details.

