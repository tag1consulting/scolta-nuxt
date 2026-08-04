/**
 * Framework-agnostic AI endpoint logic shared by the Nitro server routes.
 *
 * Returns the binding's plain EndpointResult objects; the Nitro handlers in
 * `runtime/` wrap these with `defineEventHandler`/`readBody`/`setResponseStatus`.
 * All orchestration is the SAME `ai.AiEndpointHandler` the Next adapter uses —
 * no logic is duplicated here.
 */

import { ai, type CacheDriver, NullCacheDriver, HealthChecker } from "scolta";
import type { NuxtScoltaConfig } from "./config.js";

export interface ScoltaApiOptions {
  cache?: CacheDriver;
  generation?: number;
  aiService?: ai.AiServiceLike;
  promptEnricher?: ai.PromptEnricher;
  logger?: ai.Logger;
}

export interface ScoltaApi {
  expandQuery(body: { query?: string } | undefined): Promise<ai.EndpointResult>;
  summarize(body: { query?: string; context?: string } | undefined): Promise<ai.EndpointResult>;
  followUp(body: { messages?: ai.ChatMessage[] } | undefined): Promise<ai.EndpointResult>;
  health(): Promise<Record<string, unknown>>;
}

/**
 * Default AI service, selected by the provider the developer configured.
 *
 * **This branch is the Amazee opt-in.** There is no admin UI here, so setting
 * `ai_provider` to `amazee` in code or env is the manual choice that permits
 * {@link ai.AmazeeAiService} to establish the free LiteLLM demo connection on
 * first use, backed by a filesystem credential store under the state dir.
 * Anything else — a provider unset, `anthropic`, `openai` — takes the plain
 * {@link ai.AiServiceAdapter} (explicit key / framework AI), which never
 * touches Amazee: no credential is provisioned and no outbound Amazee call is
 * made on any request path.
 *
 * With no provider selected at all, `AiServiceAdapter` builds no client and AI
 * is simply off — search still works. There is no default provider.
 */
function defaultAiService(config: NuxtScoltaConfig): ai.AiServiceLike {
  if (config.scolta.ai_provider === "amazee") {
    return new ai.AmazeeAiService(config.scolta, new ai.FilesystemConfigStorage(config.stateDir));
  }
  return new ai.AiServiceAdapter(config.scolta);
}

export function createScoltaApi(config: NuxtScoltaConfig, opts: ScoltaApiOptions = {}): ScoltaApi {
  const aiService = opts.aiService ?? defaultAiService(config);
  const handler = ai.createAiEndpointHandler(aiService, config.scolta, {
    cache: opts.cache ?? new NullCacheDriver(),
    generation: opts.generation ?? 0,
    promptEnricher: opts.promptEnricher,
    logger: opts.logger,
  });

  return {
    expandQuery: (body) => handler.handleExpandQuery(String(body?.query ?? "")),
    summarize: (body) => handler.handleSummarize(String(body?.query ?? ""), String(body?.context ?? "")),
    followUp: (body) => handler.handleFollowUp(Array.isArray(body?.messages) ? body.messages : []),
    health: async () => {
      // The full report is always computed so the trimmed status still
      // reflects degradation; without healthDetail every caller gets exactly
      // {status} — enough for uptime monitors, nothing a public endpoint
      // shouldn't expose.
      const report = await new HealthChecker(config.scolta, config.outputDir).check();
      if (!config.healthDetail) {
        return { status: report.status };
      }
      return { ...report, scoring: config.scolta.toJsScoringConfig() };
    },
  };
}
