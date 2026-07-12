# Changelog

## [Unreleased]

## [1.0.1] - 2026-07-10

### Added

- **Exposed `ScoltaTracker`** — the debounced rebuild-on-content-change helper
  the `autoRebuild` / `autoRebuildDelay` config knobs configure, matching
  scolta-next. `touch(key)` records a change and schedules a single debounced
  rebuild that reuses the token cache (only changed pages re-tokenize);
  `createScoltaTracker(config)` wires the default `rebuild` to this package's
  `buildIndex` (`BuildIntent.fresh`, no force), overridable via an explicit
  `rebuild`. Wire `touch()` to your content events under Nuxt server/SSR mode;
  static `nuxt generate` / serverless deploys rebuild via CI/webhook. Previously
  the `autoRebuild`/`autoRebuildDelay` knobs were declared but read by nothing —
  and the README's "same `ScoltaTracker` pattern as scolta-next" claim was
  untrue without the helper actually present.
- **npm pack-content guard.** A new CI step (`npm run check:pack`,
  `scripts/check-pack-contents.mjs`) runs `npm pack --dry-run --json` and
  asserts every packed path stays inside an allowlist of prefixes DERIVED
  FROM this package's own `files` field (`dist`, `README.md`, `CHANGELOG.md`,
  `LICENSE`, plus the always-packed `package.json`) and that the unpacked
  tarball stays under a size cap (500_000 bytes, ~2x the measured 244_871-byte
  baseline). The `files` field is already a fail-closed publish allowlist;
  this guard is the regression test that keeps it true so build cruft, source,
  or vendored assets can never leak into the published module — failures print
  the leaked path and point at the package.json `files` filter. Runs after
  `npm run build` (so `dist/` exists) and locally via the same script.
- **Widget-mount smoke test** — mounting `<ScoltaSearch>` with
  @vue/test-utils under jsdom now asserts the container div renders, the
  stylesheet/script tags inject with the right URLs, and the emitted
  `window.scolta` carries `container` + a `wasmPath` ending in the WASM glue
  module (nothing previously exercised the `onMounted`/DOM path).
- **CI and tag-triggered releases.** `.github/workflows/ci.yml` (PRs + main;
  Node 20/22 matrix; `npm ci`, build, test, typecheck, lint,
  `check:publish`) and `.github/workflows/release.yml` (`v*.*.*` tags publish
  to npm via OIDC Trusted Publishing — no long-lived token, automatic
  provenance).
- **Publish-shape gate.** `check:publish` runs publint +
  `@arethetypeswrong/cli`; part of the local and CI gates.

### Changed

- Document where config options are defined: link the binding's
  CONFIG_REFERENCE from the README (new `## Configuration` section).
- **The release workflow now runs the publish-surface guards before
  `npm publish` (`.github/workflows/release.yml`).** `check:publish` (publint +
  are-the-types-wrong) and `check:pack` (pack-content allowlist + size cap)
  gated only `ci.yml` on PRs, never the release workflow that actually
  publishes — so a tagged commit could ship a tarball the PR gate would have
  rejected. Both now run after `build`/`test` and before `npm publish`, gating
  the published tarball the same way CI gates PRs.
- **The health route now returns status-only by default.**
  `GET /api/scolta/v1/health` previously exposed the full diagnostic payload
  (AI provider, configured flags, index state, scoring config) to every
  caller. Monitoring endpoints keep working: the route still answers HTTP 200
  with `{"status": "ok"|"degraded"}`, computed from the full report so
  degradation stays visible. The detail moved behind the new `healthDetail`
  module option (default `false`); there is no user model in a headless
  stack, so detail is config-gated rather than auth-gated. Matches the
  status-only anonymous shape of the PHP-family and Django adapters.
- eslint moved to `recommendedTypeChecked`; `noImplicitOverride` enabled;
  documented scoped exceptions for the tests' unsafe-any family.
- vitest 1.6 -> 3.2.6 (dev-only; pulls vite 7 / patched esbuild for the
  GHSA-67mh-4wv8-2f99 dev-server advisory).
- package metadata: `repository`/`bugs` fields added.

### Fixed

- **The CJS CLI was a silent no-op.** Every `import.meta.url` in the CJS
  bundles compiled to a property of an empty object, so `node dist/cli.cjs
  assets` exited 0 having done NOTHING — the direct-invoke check compared
  `undefined` against the argv URL — and a programmatic `main()` threw from
  `copyAssets`'s `createRequire(undefined)`; `module.cjs`'s
  `createResolver(import.meta.url)` carried the same defect. Root cause: the
  tsup build lacked the `import.meta` shim for the CJS format; `shims: true`
  now derives it from `__filename`. New tests spawn `dist/cli.cjs` AND
  `dist/cli.js` as real child processes and assert the work product (assets
  actually copied into `.output/public`), not the exit code — the unshimmed
  CJS build passes an exit-code-only check.
- **`bin[scolta-build]` publish warning** — npm "cleaned" the bin value's
  `./` prefix at every publish; normalized via `npm pkg fix`
  (`./dist/cli.js` → `dist/cli.js`). `npm publish --dry-run` no longer
  warns.
- **Per-request config + API construction memoized.** Every Nitro request
  called `createScoltaApi(resolveConfig())`, re-parsing env and ~50 config
  fields and re-wiring the AI service per request. Nitro hands every request
  the same runtimeConfig object, so a WeakMap keyed on its identity now
  constructs the config + API once per config (and never pins a replaced
  runtimeConfig alive).
- **CJS consumers resolved ESM-flavoured types.** All three subpaths
  (`.`, `./core`, `./build`) pointed both `import` and `require` at one
  `.d.ts`; each condition now resolves its own types file (`.d.cts` for
  `require`), with `typesVersions` for node10-style subpath resolution.
- **Ambient `any` declarations replaced by real types.** The
  `declare module` blocks gave `vue` and `@nuxt/kit` any-shaped signatures
  (`defineComponent(options: any): any`) even though real types are
  installed; those two blocks are gone (h3/`#imports` stay — they come from
  the consumer's nitro), the module setup signature is
  `(options, nuxt: Nuxt)`, and a packaging test pins that no ambient
  declaration ever reaches the published `.d.ts` (it would augment/shadow
  consumers' real modules).

### Removed

- **Dead `resolveConfig()` in `src/runtime/util.ts`.** The per-request config
  resolution it provided was superseded by the memoized `useScoltaApi()`, which
  resolves config and constructs the API once per `runtimeConfig` identity;
  `resolveConfig()` had zero callers across `src`/`tests` after that refactor.
  Removed.

## [1.0.0] - 2026-06-09

- The `scolta` dependency now uses the published `^1.0.0` range instead of a
  local `file:../scolta-node` path, so the released tarball installs the binding
  from npm.

- Nitro AI routes now send the raw payload (`{terms}` / `{summary}` /
  `{response}`) on success and `{error}` on failure, instead of an `{ok,data}`
  envelope — matching what `scolta.js` reads and the Django/Laravel/Drupal
  controllers emit. (Previously the widget received the data nested under
  `data`, so AI overviews and expansion chips never rendered.)
- Default the AI service to the auto-configuring `AmazeeAiService` when the
  resolved provider is `amazee` (managed LiteLLM endpoint via Amazee.ai, no key
  required), backed by a filesystem credential store under the state dir.
- `fromEnv` now lets `SCOLTA_AI_PROVIDER` / `SCOLTA_API_KEY` / `SCOLTA_AI_MODEL`
  / `SCOLTA_AI_BASE_URL` override the static config, so a deployment can point AI
  at an explicit provider/key and bypass the Amazee default.
- Initial Nuxt 3 module: Nitro AI server routes, `<ScoltaSearch>` Vue component,
  static-output crawl + content-source modes, the `scolta-build` CLI, and asset
  vendoring. Reuses the `scolta` binding for all indexing/scoring/AI; no bundled
  CMS module.
