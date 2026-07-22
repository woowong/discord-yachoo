## Why

Currently, executing `/challenge @opponent` immediately initializes a 2-player multiplayer game session without obtaining the opponent's consent. Furthermore, there is no way for players to find available opponents unless they explicitly target someone. 

Introducing a 5-minute timed challenge invitation system (Accept/Decline) and an open Matchmaking Queue (Lobby) improves multiplayer game UX, prevents unwanted/unsolicited game initialization, and enables spontaneous matchmaking within Discord servers.

## What Changes

- **Challenge Invitation System**:
  - `/challenge @opponent` no longer starts the game immediately. It creates a 5-minute pending invitation with `Accept` and `Decline` interactive buttons in Discord.
  - Only the targeted opponent can interact with the `Accept` or `Decline` buttons.
  - If the invitation reaches its 5-minute timeout without response, interaction attempts notify the user that the invitation has expired.
- **Matchmaking Queue (Lobby)**:
  - Players can create an open game lobby using `/match` (or `/challenge open`).
  - An interactive lobby message is rendered with a `Join Match` button.
  - Any server member (except the host) can click `Join Match` to instantly start a 2-player game with the host.
  - The host can cancel their own open lobby using a `Cancel Lobby` button.
  - Open lobbies expire automatically after 5 minutes if unmatched.

## Capabilities

### New Capabilities
- `game-invitation`: Manages pending challenge invitations between players, including 5-minute expiration logic and accept/decline state transitions.
- `matchmaking-queue`: Manages open game lobbies (queues), including queue creation, player join matching, host cancellation, and 5-minute expiration.

### Modified Capabilities
- `game-orchestrator`: Extended to handle invitation acceptances and matchmaking queue join events to initialize active `GameState` sessions.
- `discord-slash-command-registrar`: Adds `/match` command registration and updates interaction handling for invitation and queue buttons.

## Impact

- **Persistence Layer**: Requires new database tables/repositories (`invitations` and `match_queues`) or schema additions to track pending states.
- **Workflow & Handlers**: Updates `GameWorkflowService` and Discord interaction handlers (`commands.ts`, `buttons.ts`, `router.ts`).
- **Discord Presentation**: Adds serializer support for invitation cards and open lobby queue cards.
