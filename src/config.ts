/**
 * Nuxt adapter configuration. Same shape as scolta-next, defaulting the output
 * dir to Nuxt's `nuxt generate` target. Wraps the framework-agnostic
 * {@link ScoltaConfig}; the values the developer sets are exactly what the
 * adapter reports back (Release Gate family 4).
 */

import { ScoltaConfig } from "scolta";

export type ContentMode = "static-export" | "content";

export interface NuxtScoltaConfigInit extends Record<string, unknown> {
  source?: ContentMode;
  /** `nuxt generate` output dir to crawl (Nuxt 3 default `.output/public`). */
  exportDir?: string;
  /** Parent dir the `pagefind/` index is written under. */
  outputDir?: string;
  stateDir?: string;
  assetsPublicPath?: string;
  autoRebuild?: boolean;
  autoRebuildDelay?: number;
  /**
   * Expose the full diagnostic payload on GET /health. Default false: every
   * caller gets {"status": ...} only — enough for uptime monitors. There is
   * no user model in a headless stack, so detail is config-gated, not
   * auth-gated; enable it only where the endpoint is not publicly reachable.
   */
  healthDetail?: boolean;
}

export class NuxtScoltaConfig {
  readonly scolta: ScoltaConfig;
  readonly source: ContentMode;
  readonly exportDir: string;
  readonly outputDir: string;
  readonly stateDir: string;
  readonly assetsPublicPath: string;
  readonly autoRebuild: boolean;
  readonly autoRebuildDelay: number;
  readonly healthDetail: boolean;

  constructor(init: NuxtScoltaConfigInit = {}) {
    this.scolta = ScoltaConfig.fromObject(init);
    this.source = init.source === "content" ? "content" : "static-export";
    this.exportDir = init.exportDir ?? ".output/public";
    // For `nuxt generate`, the index is written alongside the generated static
    // output so it is served at /pagefind. Override for server/hybrid setups.
    this.outputDir = init.outputDir ?? ".output/public";
    this.stateDir = init.stateDir ?? ".scolta";
    this.assetsPublicPath = init.assetsPublicPath ?? "/scolta";
    this.autoRebuild = init.autoRebuild ?? false;
    this.autoRebuildDelay = init.autoRebuildDelay ?? 2000;
    this.healthDetail = init.healthDetail ?? false;
  }

  static fromObject(init: NuxtScoltaConfigInit = {}): NuxtScoltaConfig {
    return new NuxtScoltaConfig(init);
  }

  /**
   * Environment values win over the static config so a deployment can point AI
   * at an explicit provider/key (e.g. SCOLTA_AI_PROVIDER=anthropic +
   * SCOLTA_API_KEY) and skip the Amazee default.
   */
  static fromEnv(init: NuxtScoltaConfigInit = {}, env: NodeJS.ProcessEnv = process.env): NuxtScoltaConfig {
    const merged: NuxtScoltaConfigInit = { ...init };
    if (env["SCOLTA_API_KEY"]) merged["ai_api_key"] = env["SCOLTA_API_KEY"];
    if (env["SCOLTA_AI_MODEL"]) merged["ai_model"] = env["SCOLTA_AI_MODEL"];
    if (env["SCOLTA_AI_PROVIDER"]) merged["ai_provider"] = env["SCOLTA_AI_PROVIDER"];
    if (env["SCOLTA_AI_BASE_URL"]) merged["ai_base_url"] = env["SCOLTA_AI_BASE_URL"];
    return new NuxtScoltaConfig(merged);
  }

  toBrowserConfig(): Record<string, unknown> {
    return this.scolta.toBrowserConfig();
  }
}
