import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    module: "src/module.ts",
    core: "src/core.ts",
    build: "src/build.ts",
    cli: "src/cli.ts",
    // Runtime files referenced by the module via addComponent/addServerHandler —
    // must be emitted as loadable JS at the resolver.resolve() paths.
    component: "src/component.ts",
    "runtime/expand-query.post": "src/runtime/expand-query.post.ts",
    "runtime/summarize.post": "src/runtime/summarize.post.ts",
    "runtime/followup.post": "src/runtime/followup.post.ts",
    "runtime/health.get": "src/runtime/health.get.ts",
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
