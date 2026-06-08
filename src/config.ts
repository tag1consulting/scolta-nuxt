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
  }

  static fromObject(init: NuxtScoltaConfigInit = {}): NuxtScoltaConfig {
    return new NuxtScoltaConfig(init);
  }

  static fromEnv(init: NuxtScoltaConfigInit = {}, env: NodeJS.ProcessEnv = process.env): NuxtScoltaConfig {
    const merged: NuxtScoltaConfigInit = { ...init };
    if (env["SCOLTA_API_KEY"] && merged["ai_api_key"] === undefined) merged["ai_api_key"] = env["SCOLTA_API_KEY"];
    if (env["SCOLTA_AI_MODEL"] && merged["ai_model"] === undefined) merged["ai_model"] = env["SCOLTA_AI_MODEL"];
    if (env["SCOLTA_AI_PROVIDER"] && merged["ai_provider"] === undefined) merged["ai_provider"] = env["SCOLTA_AI_PROVIDER"];
    if (env["SCOLTA_AI_BASE_URL"] && merged["ai_base_url"] === undefined) merged["ai_base_url"] = env["SCOLTA_AI_BASE_URL"];
    return new NuxtScoltaConfig(merged);
  }

  toBrowserConfig(): Record<string, unknown> {
    return this.scolta.toBrowserConfig();
  }
}
