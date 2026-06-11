import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Nuxt-virtual / consumer-provided modules, stubbed for unit tests.
      "#imports": fileURLToPath(new URL("./tests/support/imports-stub.ts", import.meta.url)),
      h3: fileURLToPath(new URL("./tests/support/h3-stub.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
