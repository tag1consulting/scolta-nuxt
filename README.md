# scolta-nuxt

Scolta module for **Nuxt 3** — AI-powered [Pagefind](https://pagefind.app)
search for Vue, on top of the shared [`scolta`](../scolta-node) binding. It is a
deliberate minimal sibling of [`scolta-next`](../scolta-next): it reuses the same
binding, the same WASM scoring core, and `scolta.js` (vanilla JS, also used by
Drupal/WordPress), so the only Nuxt-specific work is the Nitro routes, a small
Vue mount component, and the output dir. **No bundled CMS module** — there is no
Payload-equivalent that installs into a Nuxt app; Vue-native and SaaS CMSs are
reached through the generic content-source interface or the JSON:API example.

## Install

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["scolta-nuxt"],
  scolta: { site_name: "My Site", results_per_page: 12 },
});
```

The module registers the Nitro AI routes at the exact paths `scolta.js` defaults
to (`/api/scolta/v1/{expand-query,summarize,followup,health}`) and auto-registers
`<ScoltaSearch />`.

## Configuration

Options under the `scolta` key are the shared binding's — the full reference is
[`scolta`'s CONFIG_REFERENCE](../scolta-node/docs/CONFIG_REFERENCE.md).

## Selecting an AI provider is always manual

Scolta ships with **no AI provider selected**. `ai_provider` (or
`SCOLTA_AI_PROVIDER`) is empty until you set it, and while it is empty AI
features are simply off: search works, no provider is assumed, and Anthropic in
particular is not silently assumed. There is no default anywhere.

This adapter has no admin UI, so **setting `ai_provider` in code or env is the
manual opt-in**. It is a going-forward rule: a deployment that already sets a
provider keeps working exactly as before.

**Amazee.ai is never enabled on its own.** Setting `ai_provider = "amazee"` is
what permits the Amazee-backed AI service to establish the free LiteLLM demo
connection on first use — an explicit choice you wrote down. With the provider
unset or set to anything else, no credential is provisioned and no outbound
Amazee call is made, on any request path. First-use provisioning is idempotent,
and an explicit `SCOLTA_API_KEY` always wins and suppresses Amazee entirely.

Amazee support is email-only, mirroring amazee.ai's own `ai_provider_amazeeio`
module: a connection is either the free demo (no email, no account) or an
amazee.ai account attached by signing in with its email address. There is no
paste-your-API-key path.

Because there is no admin UI here, there is no in-app recovery when a
connection's credit runs out: AI degrades and the health endpoint reports it.
Re-authing is an explicit ops action — set your own credentials, or run the
provisioning path again after connecting an account.

## Health endpoint

`GET /api/scolta/v1/health` returns `{"status": "ok"|"degraded"}` — enough for
uptime monitors. The full diagnostic payload (provider, index state, scoring
config) is exposed only with `healthDetail: true` in the module options. There
is no user model in a headless stack, so detail is config-gated rather than
auth-gated; enable it only where the endpoint is not publicly reachable.

## Content modes

- **`static-export`** (default) — after `nuxt generate`, `npx scolta-build`
  crawls the rendered HTML in `.output/public/` and writes the index. Same
  static-site AI caveat as scolta-next: a fully static site has no server for
  POST endpoints (host the AI endpoint externally or run server mode).
- **`content`** — register a content source (async iterable of `ContentItem`s +
  `changed-since` check). The JSON:API / decoupled-Drupal worked example lives in
  scolta-next and applies here unchanged (it is CMS-side, not framework-side).

## CLI

```sh
npx scolta-build            # fresh build after nuxt generate
npx scolta-build --force | --resume | --restart
npx scolta-build assets     # copy runtime assets into the output dir
```

## Auto-rebuild

`ScoltaTracker` is the debounced rebuild helper the `autoRebuild` /
`autoRebuildDelay` config knobs configure — exported from `scolta-nuxt`, the
same helper [`scolta-next`](../scolta-next) ships. Wire `touch(key)` to your
content-change events and it schedules a single debounced rebuild that reuses
the token cache, so only changed pages re-tokenize:

```ts
import { createScoltaTracker, NuxtScoltaConfig } from "scolta-nuxt";

const config = NuxtScoltaConfig.fromEnv({ autoRebuild: true, source: "content" });
const tracker = createScoltaTracker(config, { source: mySource });

// from a Nitro server route / content webhook:
tracker.touch(`articles:${id}`);
```

`createScoltaTracker(config)` defaults `rebuild` to this package's `buildIndex`
(`BuildIntent.fresh`, no force); pass your own `rebuild` to override it. The
in-process debounce needs a long-running process — it works under Nuxt's
server/SSR mode, but a static `nuxt generate` or a serverless deploy has no
shared in-process timer, so trigger rebuilds via webhook/CI there. scolta-next's
Payload `afterChange`/`afterDelete` hooks are a reference wiring.
