## MODIFIED Requirements

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
