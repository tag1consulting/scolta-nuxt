#!/usr/bin/env node
/**
 * `scolta-build` CLI for Nuxt — builds the Pagefind index from a Nuxt site.
 * Reuses the framework-agnostic build engine in `scolta`; this only supplies
 * the Nuxt output dir + config.
 *
 *   npx scolta-build            # fresh build (after `nuxt generate`)
 *   npx scolta-build --force | --resume | --restart
 *   npx scolta-build assets     # copy runtime assets into the output dir
 */

import { realpathSync } from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { NuxtScoltaConfig, type NuxtScoltaConfigInit } from "./config.js";
import { buildIndex } from "./build.js";
import { copyAssets } from "./assets.js";

async function loadConfigObject(cwd: string): Promise<NuxtScoltaConfigInit> {
  for (const name of ["scolta.config.mjs", "scolta.config.js"]) {
    try {
      const mod: unknown = await import(pathToFileURL(path.join(cwd, name)).href);
      const m = mod as { default?: unknown; config?: unknown };
      const obj = m.default ?? m.config ?? mod;
      if (obj && typeof obj === "object") return obj as NuxtScoltaConfigInit;
    } catch {
      // fall through to env-only
    }
  }
  return {};
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const cwd = process.cwd();
  const config = NuxtScoltaConfig.fromEnv(await loadConfigObject(cwd));

  if (argv[0] === "assets") {
    const n = copyAssets(import.meta.url, path.join(cwd, config.outputDir), config.assetsPublicPath);
    console.log(`[scolta] Copied ${n} runtime assets into ${path.join(config.outputDir, config.assetsPublicPath)}`);
    return 0;
  }

  const mode = argv.includes("--resume") ? "resume" : argv.includes("--restart") ? "restart" : "fresh";
  const force = argv.includes("--force");
  const report = await buildIndex(config, { mode, force, logger: console });
  if (report.success) {
    console.log(`[scolta] ${report.toBuildResult().message}`);
    return 0;
  }
  console.error(`[scolta] Build failed: ${report.error}`);
  return 1;
}

/** True when this module is the entry point — symlink-safe (npm `.bin` links). */
function invokedDirectly(): boolean {
  const argv1 = process.argv[1];
  if (!argv1) return false;
  try {
    return import.meta.url === pathToFileURL(realpathSync(argv1)).href;
  } catch {
    return import.meta.url === pathToFileURL(argv1).href;
  }
}

if (invokedDirectly()) {
  main().then((code) => process.exit(code)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
