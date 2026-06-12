# scolta-nuxt — conventions

Thin Nuxt 3 module over the `scolta` binding (`../scolta-node`). It adds ONLY
Nuxt glue — Nitro server routes, a Vue mount component, the static-output crawl,
and the build CLI. It NEVER reimplements indexing, scoring, tokenizing, AI, or
content-source logic — all of that is in `scolta` and shared with scolta-next.
The JSON:API/decoupled-Drupal example is NOT duplicated here; it lives in
scolta-next and applies unchanged.

- Main entry `scolta-nuxt` is the Nuxt module (default export) + named utils.
  Framework-free build utils are also at `scolta-nuxt/build`.
- `scolta` resolves from the npm registry (the lock must stay
  registry-resolved). For local development against the sibling, build
  scolta-node and symlink manually:
  `ln -s ../../scolta-node node_modules/scolta` (any npm install/ci replaces
  it; re-create afterwards — and never run plain `npm install` while the
  symlink exists, npm's tree repair drops esbuild's platform binary).
- nuxt/@nuxt/kit/h3/vue are peer/ambient — declared in src/types/ambient.d.ts so
  the package typechecks/builds standalone; real types come from the consumer.
- No AI attribution. Tests are vitest against the plain handler/build/config
  surface (no Nuxt runtime needed); the module + Nitro routes are E2E-verified.
