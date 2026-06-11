/** Test stub for the Nuxt `#imports` virtual module (aliased in vitest.config). */

let rc: Record<string, unknown> = { scolta: {} };

export function useRuntimeConfig(): Record<string, unknown> {
  return rc;
}

export function __setRuntimeConfig(value: Record<string, unknown>): void {
  rc = value;
}
