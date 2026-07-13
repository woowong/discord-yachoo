## Context

Currently, `serializeRolling` in `src/presentation/discord/adapter/serializer.ts` hardcodes a single Giphy URL (`https://media.giphy.com/media/VGoZVlR9naOZCiRLSy/giphy.gif`) to represent the dice rolling animation. This proposal introduces multiple Giphy options to make the dice roll presentation more dynamic and visually diverse.

## Goals / Non-Goals

**Goals:**
- Define a pool of 7 Giphy URLs (1 existing + 6 new).
- Ensure the URLs are direct GIF links (i.e. formatted as `https://media.giphy.com/media/<id>/giphy.gif`) so they render correctly within Discord embeds.
- Randomly pick a Giphy URL from this pool during serialization of the rolling state.

**Non-Goals:**
- Storing the selected Giphy ID in the database or the core `GameState`. Presentation-only visual randomization is sufficient.
- Changing the game flow or physics of the Yacht game engine.

## Decisions

- **Predefined Giphy Pool**: Define `DICE_ROLL_GIPHY_POOL` as a constant array of strings in `src/presentation/discord/adapter/serializer.ts`.
  The URLs mapped from the user's input:
  1. `https://media.giphy.com/media/VGoZVlR9naOZCiRLSy/giphy.gif` (Existing)
  2. `https://media.giphy.com/media/3ohjUMQWKmu9GbjP4A/giphy.gif`
  3. `https://media.giphy.com/media/lTYLtiktVNr0k3SVOP/giphy.gif`
  4. `https://media.giphy.com/media/p24SMLHXZhmUgKOx1F/giphy.gif`
  5. `https://media.giphy.com/media/7upMd5l83SsP2GMxmL/giphy.gif`
  6. `https://media.giphy.com/media/YQmyu4dbNa9qdNh4iI/giphy.gif`
  7. `https://media.giphy.com/media/sLwfBfMlWTDbVLJApS/giphy.gif`
- **Random Selection Logic**: Use standard JS random selection:
  ```typescript
  const randomGiphy = DICE_ROLL_GIPHY_POOL[Math.floor(Math.random() * DICE_ROLL_GIPHY_POOL.length)];
  ```
  This keeps the serializer interface simple and doesn't require modifying the `GameState` schema or adding external random dependencies.

## Risks / Trade-offs

- **[Risk]** Broken Giphy URLs if Giphy changes their direct URL scheme.
  - **Mitigation**: Using the standard, highly stable `media.giphy.com/media/<id>/giphy.gif` format, which is the standard CDN pattern for Giphy embeds.
