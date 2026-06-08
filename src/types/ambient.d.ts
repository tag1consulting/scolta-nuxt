/**
 * Minimal ambient declarations for the Nuxt/Vue/h3 peer surface this module
 * touches. The real types come from the consumer's installed `nuxt` — these
 * just let scolta-nuxt typecheck and build standalone.
 */

declare module "vue" {
  export interface ComponentOptions {
    [k: string]: unknown;
  }
  export function defineComponent(options: any): any;
  export function h(type: any, props?: any, children?: any): any;
  export function onMounted(cb: () => void): void;
  export function ref<T>(value: T): { value: T };
}

declare module "@nuxt/kit" {
  export function defineNuxtModule<_T = any>(definition: any): any;
  export function addServerHandler(handler: { route: string; handler: string; method?: string }): void;
  export function addComponent(component: { name: string; filePath: string; mode?: string }): void;
  export function createResolver(url: string): { resolve(...paths: string[]): string };
  export function addImportsDir(dir: string): void;
}

declare module "h3" {
  export interface H3Event {
    [k: string]: unknown;
  }
  export function defineEventHandler<T = any>(handler: (event: H3Event) => T): T;
  export function readBody<T = any>(event: H3Event): Promise<T>;
  export function getQuery(event: H3Event): Record<string, unknown>;
  export function setResponseStatus(event: H3Event, status: number): void;
  export function setResponseHeader(event: H3Event, name: string, value: string): void;
}

declare module "#imports" {
  export function useRuntimeConfig(): { scolta?: Record<string, unknown>; [k: string]: unknown };
  export { defineEventHandler, readBody, getQuery, setResponseStatus, setResponseHeader } from "h3";
}
