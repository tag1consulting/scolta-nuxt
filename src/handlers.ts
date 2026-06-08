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

export function createScoltaApi(config: NuxtScoltaConfig, opts: ScoltaApiOptions = {}): ScoltaApi {
  const aiService = opts.aiService ?? new ai.AiServiceAdapter(config.scolta);
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
