/**
 * Minimal ambient declarations for the h3 / #imports surface the Nitro route
 * handlers touch. The real types come from the consumer's installed `nuxt` —
 * these just let scolta-nuxt typecheck and build standalone. (`vue` and
 * `@nuxt/kit` use their real installed types and are NOT declared here.)
 *
 * These declarations must never reach the published .d.ts — they would
 * augment/shadow the consumer's real modules. The dist-packaging test pins
 * that.
 */

declare module "h3" {
  export interface H3Event {
    [k: string]: unknown;
  }
  export function defineEventHandler<T = unknown>(handler: (event: H3Event) => T): T;
  export function readBody<T = unknown>(event: H3Event): Promise<T>;
  export function getQuery(event: H3Event): Record<string, unknown>;
  export function setResponseStatus(event: H3Event, status: number): void;
  export function setResponseHeader(event: H3Event, name: string, value: string): void;
}

declare module "#imports" {
  export function useRuntimeConfig(): { scolta?: Record<string, unknown>; [k: string]: unknown };
  export { defineEventHandler, readBody, getQuery, setResponseStatus, setResponseHeader } from "h3";
}
