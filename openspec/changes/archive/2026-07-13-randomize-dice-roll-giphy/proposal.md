## Why

Currently, the dice roll animation in Discord uses a single, hardcoded Giphy URL. This lacks visual variety and makes the gameplay experience repetitive. Randomly choosing from a pool of diverse dice-rolling Giphy animations will make the rolling phase more dynamic and engaging for players.

## What Changes

- Create a pre-defined array/list of Giphy URLs for the dice roll animation, including the existing URL and 6 new URLs provided by the user.
- Modify the serialization logic of the rolling state to select a random URL from this pool every time a roll is initiated.

## Capabilities

### New Capabilities
<!-- Capabilities being introduced. Replace <name> with kebab-case identifier (e.g., user-auth, data-export, api-rate-limiting). Each creates specs/<name>/spec.md -->

### Modified Capabilities
<!-- Existing capabilities whose REQUIREMENTS are changing (not just implementation).
     Only list here if spec-level behavior changes. Each needs a delta spec file.
     Use existing spec names from openspec/specs/. Leave empty if no requirement changes. -->
- `discord-interaction-parser`: Update the serialization of the rolling state (`serializeRolling`) to use a random dice-rolling Giphy URL from a predefined list instead of a single hardcoded URL.

## Impact

- `src/presentation/discord/adapter/serializer.ts`: The `serializeRolling` method will be updated to select a random URL from the pool of Giphys.
- Predefined list of Giphy URLs:
  - `https://media.giphy.com/media/VGoZVlR9naOZCiRLSy/giphy.gif` (Existing)
  - `https://media.giphy.com/media/3ohjUMQWKmu9GbjP4A/giphy.gif`
  - `https://media.giphy.com/media/lTYLtiktVNr0k3SVOP/giphy.gif`
  - `https://media.giphy.com/media/p24SMLHXZhmUgKOx1F/giphy.gif`
  - `https://media.giphy.com/media/7upMd5l83SsP2GMxmL/giphy.gif`
  - `https://media.giphy.com/media/YQmyu4dbNa9qdNh4iI/giphy.gif`
  - `https://media.giphy.com/media/sLwfBfMlWTDbVLJApS/giphy.gif`
