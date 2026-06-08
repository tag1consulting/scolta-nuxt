/**
 * Framework-free core surface — everything except the Nuxt module itself.
 *
 * Importable from plain Node (build scripts, tests, CI) without pulling
 * `@nuxt/kit`: config, the AI handler logic, the build runner, the content-source
 * protocol, and the browser bootstrap. The Nuxt module entry (`scolta-nuxt`,
 * the default export for `modules: ['scolta-nuxt']`) re-exports all of this too.
 */

export { NuxtScoltaConfig, type NuxtScoltaConfigInit, type ContentMode } from "./config.js";
export { createScoltaApi, type ScoltaApi, type ScoltaApiOptions } from "./handlers.js";
export { buildIndex, crawlStaticOutput, exportPathToUrl, type BuildOptions } from "./build.js";
export {
  CachedContentReference,
  collectSource,
  type ScoltaContentSource,
  type EnumeratedContent,
} from "./content-source.js";
export { buildWindowScolta, type BootstrapOptions } from "./bootstrap.js";
