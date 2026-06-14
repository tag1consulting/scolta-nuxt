#!/usr/bin/env node
/**
 * npm pack-content guard.
 *
 * The `files` field in package.json is already a fail-closed publish
 * allowlist. This script is the regression test that keeps it true: it runs
 * `npm pack --dry-run --json`, derives the set of allowed path prefixes FROM
 * THIS REPO'S OWN `files` field (never a hardcoded generic list), and asserts
 * every packed path lives under one of them. Anything outside the allowlist
 * fails the build with the leaked path printed.
 *
 * Why this exists: a Pagefind-search sibling (scolta-wp) once shipped a ~13 MB
 * zip when build cruft leaked past the file filter, and the WordPress.org
 * reviewers flagged dist-cruft on the PHP family. A Nuxt module's `dist/`
 * (runtime/ + module.mjs + chunks + maps + .d.ts) is exactly the kind of tree
 * that grows quietly, so we pin both WHAT ships and HOW BIG it is.
 *
 * The filter that decides what ships lives in package.json `files`. Fix leaks
 * there (add/remove a prefix), not here — this script only reads that field.
 *
 * Requires `npm run build` to have produced dist/ first (npm pack does not
 * build); the CI job and the local gate both build before calling this.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as path from "node:path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkgPath = path.join(repoRoot, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));

// Measured against the current good artifact (`npm pack --dry-run --json`):
// unpackedSize = 244_871 bytes (~0.24 MB) on 2026-06-14. Cap at ~2x the
// measured value so ordinary growth passes but a cruft/asset leak trips it.
const MAX_UNPACKED_BYTES = 500_000;
const MEASURED_UNPACKED_BYTES = 244_871;

// Allowlist of packed-path PREFIXES, derived from this repo's own `files`
// field — NOT hardcoded. A `files` entry naming a directory (e.g. "dist")
// authorizes everything under "dist/"; an entry naming a file authorizes that
// exact path. npm always packs package.json regardless of `files`, so it is
// the one unconditional addition.
const filesField = Array.isArray(pkg.files) ? pkg.files : [];
if (filesField.length === 0) {
  console.error("pack-guard: package.json has no `files` field — refusing to validate an open publish set.");
  process.exit(1);
}

/** Normalize a `files` entry to a leading path segment, no ./ or trailing /. */
const norm = (p) => p.replace(/^\.\//, "").replace(/\/+$/, "");
const allowedDirs = new Set(filesField.map(norm)); // each may be a dir OR a file
const allowedExact = new Set(["package.json", ...filesField.map(norm)]);

const allowed = (packedPath) => {
  const rel = norm(packedPath);
  if (allowedExact.has(rel)) return true;
  // dir prefix match: any `files` entry treated as a directory root
  for (const dir of allowedDirs) {
    if (rel === dir || rel.startsWith(dir + "/")) return true;
  }
  return false;
};

console.log(`pack-guard: allowlist derived from package.json \`files\`: ${JSON.stringify(filesField)} (+ package.json)`);

const raw = execFileSync("npm", ["pack", "--dry-run", "--json"], {
  cwd: repoRoot,
  encoding: "utf-8",
  maxBuffer: 32 * 1024 * 1024,
});

const parsed = JSON.parse(raw);
const entry = Array.isArray(parsed) ? parsed[0] : parsed;
if (!entry || !Array.isArray(entry.files)) {
  console.error("pack-guard: could not read file list from `npm pack --dry-run --json`.");
  process.exit(1);
}

const packedPaths = entry.files.map((f) => f.path);
const leaked = packedPaths.filter((p) => !allowed(p));

let failed = false;

if (leaked.length > 0) {
  failed = true;
  console.error(
    `\npack-guard: ${leaked.length} packed path(s) are OUTSIDE the publish allowlist:`,
  );
  for (const p of leaked) console.error(`  LEAKED: ${p}`);
  console.error(
    "\nThese files would publish to npm but are not authorized by package.json `files`.",
  );
  console.error(
    "Fix at the filter: add/correct the `files` field in package.json, or stop emitting the file.",
  );
}

const unpacked = entry.unpackedSize ?? 0;
if (unpacked > MAX_UNPACKED_BYTES) {
  failed = true;
  console.error(
    `\npack-guard: unpacked size ${unpacked} bytes exceeds cap ${MAX_UNPACKED_BYTES} bytes ` +
      `(~2x the ${MEASURED_UNPACKED_BYTES}-byte measured baseline). Something large leaked into ` +
      "the tarball — inspect `npm pack --dry-run` and the package.json `files` filter.",
  );
}

if (failed) process.exit(1);

console.log(
  `pack-guard: OK — ${packedPaths.length} files, unpacked ${unpacked} bytes ` +
    `(cap ${MAX_UNPACKED_BYTES}), all within the \`files\` allowlist.`,
);
