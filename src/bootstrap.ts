/**
 * Pure helper building the `window.scolta` bootstrap from the resolved browser
 * config — unit-testable without a DOM. Reflects the SAVED config (Release Gate
 * family 4). Shared by the Vue component.
 */

export interface BootstrapOptions {
  assetsPath?: string;
  pagefindPath?: string;
}

export function buildWindowScolta(
  browserConfig: Record<string, unknown>,
  opts: BootstrapOptions = {},
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...browserConfig };
  if (opts.pagefindPath) result["pagefindPath"] = opts.pagefindPath;
  if (opts.assetsPath) result["wasmPath"] = `${opts.assetsPath.replace(/\/$/, "")}/wasm/`;
  return result;
}
