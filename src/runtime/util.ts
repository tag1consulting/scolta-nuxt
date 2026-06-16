/**
 * Shared Nitro response mapping + per-request config resolution for the
 * server/api/scolta/v1 route handlers.
 */

import { setResponseHeader, setResponseStatus, type H3Event } from "h3";
import { useRuntimeConfig } from "#imports";
import { NuxtScoltaConfig, type NuxtScoltaConfigInit } from "../config.js";
import { createScoltaApi, type ScoltaApi } from "../handlers.js";

export interface EndpointResultLike {
  ok: boolean;
  status?: number;
  data?: unknown;
  error?: string;
  retry_after?: string;
  limit?: number;
}

// Nitro hands every request the same runtimeConfig object, so its identity
// keys the cache: config + API construction (an env re-parse over ~50 fields
// plus AI service wiring) happens once per config, not once per request. A
// WeakMap so a replaced runtimeConfig (tests, dev reloads) never pins the old
// API alive.
const apiCache = new WeakMap<object, ScoltaApi>();

/** The ScoltaApi for the current runtimeConfig — memoized by its identity. */
export function useScoltaApi(): ScoltaApi {
  const rc = useRuntimeConfig() as object;
  const cached = apiCache.get(rc);
  if (cached) return cached;
  const api = createScoltaApi(
    NuxtScoltaConfig.fromEnv(((rc as { scolta?: unknown }).scolta ?? {}) as NuxtScoltaConfigInit),
  );
  apiCache.set(rc, api);
  return api;
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
