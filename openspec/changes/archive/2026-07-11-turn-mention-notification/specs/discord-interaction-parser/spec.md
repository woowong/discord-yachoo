## MODIFIED Requirements

### Requirement: Discord Interaction Request Parsing
The system SHALL parse incoming JSON bodies into type-safe structures mapping to Discord Interaction Types (PING, ApplicationCommand, MessageComponent) and extract interaction metadata, including the `guild_id` and `channel_id`.

#### Scenario: Parse PING (Type 1)
- **WHEN** the raw JSON contains `type: 1`
- **THEN** the parser SHALL return a PING interaction type.

#### Scenario: Parse Slash Command (Type 2)
- **WHEN** the raw JSON contains `type: 2`, data name `/challenge` with options containing player info, a valid `guild_id`, and a valid `channel_id`
- **THEN** the parser SHALL extract the command name, arguments, application_id, token, `guildId`, and the `channelId` into a parsed Command interaction.

#### Scenario: Parse Message Component (Type 3)
- **WHEN** the raw JSON contains `type: 3`, component custom_id `roll_dice`, a valid `guild_id`, and a valid `channel_id`
- **THEN** the parser SHALL parse it as a Component interaction and extract the application_id, token, `guildId`, and the `channelId`.
