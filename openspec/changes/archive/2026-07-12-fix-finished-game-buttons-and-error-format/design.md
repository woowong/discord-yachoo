## Context

When a Yacht Dice game finishes, all user interfaces like roll buttons, hold buttons, and category selection dropdowns should be removed from the Discord message. If they are left behind, players might try to click them, triggering webhook events that result in server-side domain errors.
Furthermore, domain errors (such as `GameAlreadyOverError`) were not inheriting from the standard JavaScript `Error` class and did not contain a `message` property. This caused the global error catcher to format the error message as `Error: [object Object]`.

## Goals / Non-Goals

**Goals:**
- Clear all interaction buttons/dropdowns from the Discord message once the game is finished.
- Standardize all domain custom error classes to inherit from the built-in `Error` class.
- Verify through unit and integration testing that error messages are readable and UI components are cleared.

**Non-Goals:**
- Adding new game mechanics or changing game scoring logic.
- Rewriting the error-catching middleware in `index.ts`.

## Decisions

- **Decision 1**: Inherit standard JavaScript `Error` in custom error classes.
  - *Rationale*: This is a standard and robust JS/TS pattern. By extending `Error`, the classes automatically gain `message`, `stack`, and `name` properties. This directly fixes the type check `typeof err === "object" && "message" in err` in `index.ts`.
- **Decision 2**: Pass `components` array instead of `undefined` in `serializeGame`.
  - *Rationale*: Discord requires an empty components array (`[]`) to strip out active buttons/menus from an existing message. Using `undefined` leaves the key out, which makes Discord retain the previous message state.
- **Decision 3**: Gracefully catch `GameAlreadyOverError` on component interaction handlers.
  - *Rationale*: Stale interaction buttons on older game messages can trigger `GameAlreadyOverError`. Instead of failing and showing an ephemeral error alert (which leaves the stale buttons in place), catching the error and returning the existing finished `gameState` forces a re-render of the message with `components: []`, naturally clearing the buttons.

## Risks / Trade-offs

- **[Risk]** Empty components list might crash on initial slash command response.
  - **Mitigation**: Initial slash command message payloads also support `components: []` (which resolves to no components), and testing confirms it works seamlessly.
- **[Risk]** Catching `GameAlreadyOverError` might mask other domain flow issues.
  - **Mitigation**: The catch block specifically targets `GameAlreadyOverError` and simply returns the current finished game state without mutating it or executing any game turns. This is safe, idempotent, and only applies to finished games.
