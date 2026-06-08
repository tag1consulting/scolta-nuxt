/**
 * scolta-nuxt — the Nuxt 3 module.
 *
 * Registers the AI endpoints as Nitro server routes at the exact paths scolta.js
 * defaults to, auto-registers the <ScoltaSearch> component, and exposes config
 * to the server routes via runtimeConfig. All indexing/scoring/AI logic lives in
 * the shared `scolta` binding — this module is only Nuxt wiring.
 */

import { addComponent, addServerHandler, createResolver, defineNuxtModule } from "@nuxt/kit";
import type { NuxtScoltaConfigInit } from "./config.js";

export type ModuleOptions = NuxtScoltaConfigInit;

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "scolta-nuxt",
    configKey: "scolta",
    compatibility: { nuxt: ">=3.0.0" },
  },
  defaults: {
    source: "static-export",
  },
  setup(options: ModuleOptions, nuxt: any) {
    const resolver = createResolver(import.meta.url);

    // Expose config to the Nitro server routes (private runtimeConfig).
    nuxt.options.runtimeConfig = nuxt.options.runtimeConfig ?? {};
    nuxt.options.runtimeConfig.scolta = { ...(nuxt.options.runtimeConfig.scolta ?? {}), ...options };

    // Mount the AI endpoints at scolta.js's default paths.
    addServerHandler({ route: "/api/scolta/v1/expand-query", method: "post", handler: resolver.resolve("./runtime/expand-query.post") });
    addServerHandler({ route: "/api/scolta/v1/summarize", method: "post", handler: resolver.resolve("./runtime/summarize.post") });
    addServerHandler({ route: "/api/scolta/v1/followup", method: "post", handler: resolver.resolve("./runtime/followup.post") });
    addServerHandler({ route: "/api/scolta/v1/health", method: "get", handler: resolver.resolve("./runtime/health.get") });

    // Auto-register the Vue search component.
    addComponent({ name: "ScoltaSearch", filePath: resolver.resolve("./component") });
  },
});

// The framework-free core is also available from the module entry (Nuxt
// context). Plain-Node consumers should import from `scolta-nuxt/core` to avoid
// loading @nuxt/kit.
export * from "./core.js";
