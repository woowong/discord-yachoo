# Operational Logging Specification

## Purpose
Provide a structured operational audit logging system in production to monitor activities, trace user actions, and troubleshoot errors.

## Requirements

### Requirement: Log signature verification failures
The interaction handling entry point SHALL log warning messages when signature verification fails, to assist with webhook setup troubleshooting.

#### Scenario: Verification failure due to invalid signature
- **WHEN** an incoming HTTP request fails the signature check (Ed25519)
- **THEN** the system SHALL log a warning stating that signature verification failed and return 401 Unauthorized

### Requirement: Log interaction parsing failures
The interaction parser SHALL log warning messages when the request payload cannot be parsed as a valid Discord interaction.

#### Scenario: Parsing failure due to invalid payload
- **WHEN** a request has a valid signature but contains invalid JSON or unsupported interaction structure
- **THEN** the system SHALL log a warning stating that parsing failed and return 400 Bad Request

### Requirement: Contextual log annotations
For every valid Discord interaction, the system SHALL annotate all subsequent logs within the execution context with interaction metadata.

#### Scenario: Attaching metadata to interaction logs
- **WHEN** an interaction is successfully parsed and processed
- **THEN** the system SHALL bind metadata containing `userId`, `guildId`, `gameId`, and `interactionId` as log annotations so that all downstream logs are structured with this context

### Requirement: Audit logging for critical game lifecycle events
The system SHALL log informational messages for critical game lifecycle events to provide an operational audit trail.

#### Scenario: Logging game initialization and turn execution
- **WHEN** a new game starts, a user rolls dice, a category is selected, or a match is finalized
- **THEN** the system SHALL log an info message detailing the player, game ID, actions performed, and status change

### Requirement: Log unhandled exceptions
The system SHALL log any unexpected failures or uncaught errors during interaction processing at the error log level.

#### Scenario: Database or Discord API failure
- **WHEN** a repository action or Discord API fetch fails within the handler execution flow
- **THEN** the system SHALL log an error with the detailed exception message and stack trace before returning the error response payload
