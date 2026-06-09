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
 * Default AI service: when the resolved provider is `amazee`, use the
 * auto-provisioning {@link ai.AmazeeAiService} (free LiteLLM trial on first use,
 * no key required) backed by a filesystem credential store under the state dir.
 * Otherwise the plain {@link ai.AiServiceAdapter} (explicit key / framework AI).
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
    followUp: (body) => handler.handleFollowUp(Array.isArray(body?.messages) ? body!.messages! : []),
    health: async () => ({
      ...(await new HealthChecker(config.scolta, config.outputDir).check()),
      scoring: config.scolta.toJsScoringConfig(),
    }),
  };
}
