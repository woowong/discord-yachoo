import { describe, it, expect } from "vitest";
import { Effect } from "effect";

describe("Initial Setup Test", () => {
  it("should successfully run an Effect", () => {
    const program = Effect.succeed("Hello Effect!");
    const result = Effect.runSync(program);
    expect(result).toBe("Hello Effect!");
  });
});
