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

/**
 * Map an EndpointResult to a Nitro response body (sets status/headers as needed).
 * scolta.js reads the payload fields (terms/summary/response) directly off the
 * response body, so success responses send the raw `data` (not an {ok,data}
 * envelope) and failures send {error} — mirroring the Django/Laravel/Drupal
 * controllers' response mapping exactly.
 */
export function respond(event: H3Event, result: EndpointResultLike): unknown {
  if (result.ok) {
    return result.data ?? {};
  }
  setResponseStatus(event, result.status ?? 500);
  if (result.retry_after) setResponseHeader(event, "Retry-After", result.retry_after);
  return { error: result.error ?? "Error" };
}
