## ADDED Requirements

### Requirement: Architecture Separation of Interaction Handling
The system SHALL separate Discord Webhook parsing and Signature verification from the actual game play orchestrating logic.
The play orchestration logic MUST be encapsulated in a decoupled Application Service (`GameWorkflowService`) using pure Effect.ts layers.

#### Scenario: Verify decoupled GamePlay execution
- **WHEN** a valid roll or category selection interaction is received
- **THEN** the system SHALL execute the logic through the `GameWorkflowService` without direct coupling to HTTP/Webhook request objects.

### Requirement: Refactoring Safety via Integration Test Suite
The system SHALL have a comprehensive Integration Test Suite that runs in `vitest` to verify the end-to-end webhook interactions (ping, challenge, roll, hold, select_category, surrender).
All existing scenarios MUST be fully verified by this test suite, and the tests MUST pass successfully before and after refactoring (Red-Green-Refactor).

#### Scenario: Verify Integration Test Suite execution
- **WHEN** the test suite is run on the worker entry point (`src/index.ts`)
- **THEN** it SHALL simulate Discord webhook requests and verify that all database updates, Discord API calls, and final responses match the original behavior.
