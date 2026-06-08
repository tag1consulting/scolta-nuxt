/**
 * Shared Nitro response mapping + per-request config resolution for the
 * server/api/scolta/v1 route handlers.
 */

import { setResponseHeader, setResponseStatus, type H3Event } from "h3";
import { useRuntimeConfig } from "#imports";
import { NuxtScoltaConfig, type NuxtScoltaConfigInit } from "../config.js";

export interface EndpointResultLike {
  ok: boolean;
  status?: number;
  data?: unknown;
  error?: string;
  retry_after?: string;
  limit?: number;
}

/** Resolve the per-request config from Nuxt runtimeConfig + environment. */
export function resolveConfig(): NuxtScoltaConfig {
  const rc = useRuntimeConfig();
  return NuxtScoltaConfig.fromEnv((rc.scolta ?? {}) as NuxtScoltaConfigInit);
}

/** Map an EndpointResult to a Nitro response (sets status/headers as needed). */
export function respond(event: H3Event, result: EndpointResultLike): Record<string, unknown> {
  if (result.ok) {
    return { ok: true, data: result.data ?? {} };
  }
  setResponseStatus(event, result.status ?? 400);
  if (result.retry_after) setResponseHeader(event, "Retry-After", result.retry_after);
  const body: Record<string, unknown> = { ok: false, error: result.error };
  if (result.limit !== undefined) body["limit"] = result.limit;
  return body;
}
