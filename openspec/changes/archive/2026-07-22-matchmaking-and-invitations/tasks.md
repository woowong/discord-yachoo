## 1. Domain & Persistence Layer Setup

- [x] 1.1 Create `Invitation` and `MatchQueue` domain types in `src/domain/invitation.ts` and `src/domain/matchQueue.ts` with expiration calculation functions.
- [x] 1.2 Create D1 migration script for `invitations` and `match_queues` tables.
- [x] 1.3 Implement `InvitationRepository` and `MatchQueueRepository` in `src/persistence/repository.ts` and their corresponding D1 (`D1Repository.ts`) and In-Memory (`MemoryRepository.ts`) implementations.

## 2. Application Layer Workflows

- [x] 2.1 Extend `GameWorkflowService` to support direct challenge invitation creation, acceptance, decline, and lazy expiration.
- [x] 2.2 Extend `GameWorkflowService` to support open match queue creation, joining, cancellation, and lazy expiration.

## 3. Presentation & Interaction Handlers

- [x] 3.1 Update `DiscordResponseSerializer` in `src/presentation/discord/adapter/serializer.ts` to serialize invitation cards and open queue cards with interactive Discord buttons.
- [x] 3.2 Update `/challenge` command handler in `commands.ts` to issue 5-minute pending invitations for multiplayer challenges.
- [x] 3.3 Add `/match` command handler in `commands.ts` for open queue matchmaking.
- [x] 3.4 Update component interaction router (`router.ts` & `buttons.ts`) to process custom IDs for invitation accept/decline and queue join/cancel.
- [x] 3.5 Update slash command registration script to include `/match` command.

## 4. Verification & Testing

- [x] 4.1 Add unit tests for invitation and queue state logic in `src/domain/`.
- [x] 4.2 Add integration tests in `src/index.test.ts` verifying end-to-end webhook interactions for direct invitations and open matchmaking queues.
