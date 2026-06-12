/**
 * Packaging guard: the ambient module declarations in src/types/ambient.d.ts
 * (h3, #imports) exist only so this package typechecks standalone. If they
 * ever reach the published .d.ts they would augment/shadow the consumer's
 * REAL modules with any-shaped signatures. tsup currently keeps them out —
 * pin that.
 *
 * Requires `npm run build` to have run (the local gate builds before testing).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");

describe("published types carry no ambient module declarations", () => {
  it("dist exists", () => {
    expect(fs.existsSync(dist), "dist missing — run `npm run build` before the test gate").toBe(
      true,
    );
  });

  it("no declare module blocks leak into any emitted .d.ts/.d.cts", () => {
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (/\.d\.(ts|cts|mts)$/.test(entry.name)) {
          const text = fs.readFileSync(full, "utf-8");
          if (/declare module ["'](vue|h3|@nuxt\/kit|#imports)["']/.test(text)) {
            offenders.push(path.relative(dist, full));
          }
        }
      }
    };
    walk(dist);
    expect(offenders).toEqual([]);
  });
});
