import { Effect } from "effect";

export default {
  async fetch(request: Request): Promise<Response> {
    const program = Effect.gen(function* () {
      return new Response("Yacht Dice Worker Initialized Successfully!");
    });

    return Effect.runPromise(program);
  }
};
