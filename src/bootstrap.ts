/**
 * Pure helper building the `window.scolta` bootstrap from the resolved browser
 * config — unit-testable without a DOM. Reflects the SAVED config (Release Gate
 * family 4). Shared by the Vue component.
 */

export interface BootstrapOptions {
  assetsPath?: string;
  pagefindPath?: string;
  /** DOM id of the mount container (default scolta-search). */
  containerId?: string;
}

export function buildWindowScolta(
  browserConfig: Record<string, unknown>,
  opts: BootstrapOptions = {},
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...browserConfig };
  if (opts.pagefindPath) result["pagefindPath"] = opts.pagefindPath;
  // scolta.js auto-init bails unless window.scolta.container names the mount
  // point, and it loads WASM via `import(wasmPath)` where wasmPath must be the
  // full glue-module path (…/wasm/scolta_core.js), not the directory. Mirror
  // the Django/WP/Laravel adapters so the browser widget actually mounts.
  result["container"] = `#${opts.containerId ?? "scolta-search"}`;
  if (opts.assetsPath && !result["wasmPath"]) {
    result["wasmPath"] = `${opts.assetsPath.replace(/\/$/, "")}/wasm/scolta_core.js`;
  }
  return result;
}
