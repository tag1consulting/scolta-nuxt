/**
 * Copy the vendored scolta runtime assets from the installed `scolta` package
 * into the Nuxt `public/` tree so they serve statically. Used by the
 * `scolta-build assets` CLI subcommand.
 */

import { createRequire } from "node:module";
import * as fs from "node:fs";
import * as path from "node:path";

export function resolveScoltaAssetsDir(fromUrl: string): string {
  const require = createRequire(fromUrl);
  const pkgJson = require.resolve("scolta/package.json");
  return path.join(path.dirname(pkgJson), "assets");
}

function copyDir(src: string, dest: string): number {
  let count = 0;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) count += copyDir(s, d);
    else {
      fs.copyFileSync(s, d);
      count += 1;
    }
  }
  return count;
}

export function copyAssets(fromUrl: string, publicDir: string, assetsPublicPath: string): number {
  return copyDir(resolveScoltaAssetsDir(fromUrl), path.join(publicDir, assetsPublicPath.replace(/^\//, "")));
}
