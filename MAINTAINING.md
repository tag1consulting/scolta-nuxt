# Maintaining scolta-nuxt

The Nuxt 3 module over the `scolta` binding. Publishes to npm.

Everything true of more than one Scolta repo lives in
[scolta-core/MAINTAINING.md](https://github.com/tag1consulting/scolta-core/blob/main/MAINTAINING.md):
the version rules, the release order, the fleet checks, the rules every repo shares.

**What it is.** A Nuxt module, framework glue only: the Nitro server routes, a Vue mount component, the
static-output crawl and the build CLI. It depends on `scolta` (the repo is `scolta-node`) and never on
`scolta-core` directly.

**Where the version lives.** `package.json`.

**Where it publishes.** npm, as `scolta-nuxt`. To confirm: `npm install scolta-nuxt` in a throwaway
directory resolves it. The main entry is the Nuxt module (default export) plus named utils; the
framework-free build utils are also at `scolta-nuxt/build`.

**CI checks.** One `test` job across Node 20 and 22, running `npm run build`, `npm test` (vitest),
`npm run typecheck`, `npm run lint`, `npm run check:publish` and `npm run check:pack`.

**On release day.** Release this after scolta-node. Tag `vX.Y.Z`; the release workflow publishes through
Trusted Publishing (OIDC), which attaches provenance automatically.

**Watch out for.**

- The unit tests cover the plain handler, build and config surface, which needs no Nuxt runtime. The four
  Nitro route files under `src/runtime/` (`health.get.ts`, `expand-query.post.ts`, `summarize.post.ts`,
  `followup.post.ts`) are not exercised by any test here; `runtime-memoization.test.ts` covers
  `src/runtime/util.ts` only. The module and its routes are verified end to end by the Nuxt demo, so a
  change to those four files is a demo-verified change, not a CI-verified one.
- `nuxt`, `@nuxt/kit`, `h3` and `vue` are peer or ambient, declared in `src/types/ambient.d.ts` so this
  package typechecks and builds standalone. The real types come from the consumer.
- The lockfile must stay registry-resolved. For local development against the sibling, build scolta-node
  and `ln -s ../../scolta-node node_modules/scolta`, re-creating it after any install. Never run plain
  `npm install` while that symlink exists: npm's tree repair drops esbuild's platform binary.
- The `file:` dependency trap: the published manifest must carry a semver, never a `file:` path.
  `check:pack` is what catches a leftover.
- This package carries no copy of the browser bundle; it comes from `scolta`.
