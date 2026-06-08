import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    module: "src/module.ts",
    core: "src/core.ts",
    build: "src/build.ts",
    cli: "src/cli.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "node20",
  external: ["nuxt", "@nuxt/kit", "h3", "vue", "#imports", "scolta"],
  outExtension({ format }) {
    return { js: format === "cjs" ? ".cjs" : ".js" };
  },
});
