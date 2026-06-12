/** Test stub for `h3` (aliased in vitest.config) — only what util.ts touches. */

export interface H3Event {
  [k: string]: unknown;
}

export function defineEventHandler<T>(handler: (event: H3Event) => T): (event: H3Event) => T {
  return handler;
}

export function readBody<T>(event: H3Event): Promise<T> {
  return Promise.resolve(event["__body"] as T);
}

export function setResponseStatus(event: H3Event, status: number): void {
  event["__status"] = status;
}

export function setResponseHeader(event: H3Event, name: string, value: string): void {
  const headers = (event["__headers"] ??= {}) as Record<string, string>;
  headers[name] = value;
}
