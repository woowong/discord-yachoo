## ADDED Requirements

### Requirement: Consistent Dice Hold Button Labels during Rolling Animation
The Discord presentation layer SHALL render dice hold buttons during the rolling animation (`serializeRollingMessage`) using the exact same label format (`isHeld ? "🔒" : [idx + 1]`) as standard turn rendering (`serializeGameState`), preventing layout shifts or text length changes when buttons are disabled.

#### Scenario: Rolling animation dice button label consistency
- **WHEN** the game UI renders the rolling animation message with disabled dice buttons
- **THEN** held dice buttons MUST display label `"🔒"` and unheld dice buttons MUST display label `[idx + 1]`, matching active turn rendering exactly

### Requirement: Discord Handlers for Surrender Proposal and Acceptance
The Discord interaction parser and game orchestrator SHALL process surrender proposals, acceptances, and declines via dedicated component custom IDs (`offer_surrender`, `accept_surrender`, `decline_surrender`), providing appropriate Ephemeral feedback to unauthorized users.

#### Scenario: Sending surrender proposal message
- **WHEN** a player confirms a surrender proposal
- **THEN** the system MUST update or send a channel message containing `[🤝 수락]` and `[❌ 거절]` buttons specifically targeting the opponent

#### Scenario: Unauthorized user clicks accept or decline button
- **WHEN** a user who is not the designated opponent attempts to click the accept or decline button
- **THEN** the system MUST respond with an Ephemeral warning message denying the action
