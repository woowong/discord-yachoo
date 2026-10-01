import { bindings, defineConfig } from "cf/config";

/**
 * Secret-like files were detected but not read or migrated: .dev.vars, experiments/flywire-poc/.env.example. Only `secrets.required` entries are migrated.
 * @see https://developers.cloudflare.com/workers/configuration/secrets/
 */

/**
 * Wrangler environments are selected through ctx.mode and the cf --mode flag.
 * @see https://developers.cloudflare.com/workers/wrangler/environments/
 */

export default defineConfig((ctx) => {
	switch (ctx.mode) {
		case "staging": {
			return {
				worker: {
					name: "discord-yachoo-stage",
					compatibilityDate: "2024-05-02",
					entrypoint: "src/index.ts",
					env: {
						FLY_BRAIN_URL: bindings.text("https://solving-delaware-confident-test.trycloudflare.com"),
						DB: bindings.d1({
							name: "yacht_dice_stage",
							id: "f8368ba8-d490-418a-884d-cd27ab0cc3e7",
						}),
					},
				},
			};
		}
		default: {
			return {
				worker: {
					name: "discord-yachoo",
					compatibilityDate: "2024-05-02",
					entrypoint: "src/index.ts",
					env: {
						FLY_BRAIN_URL: bindings.text("https://solving-delaware-confident-test.trycloudflare.com"),
						DB: bindings.d1({
							name: "yacht_dice",
							id: "d30f4a69-d298-4374-ab91-7fea361a693a",
						}),
					},
				},
			};
		}
	}
});
