/**
 * Index build runner for both Nuxt content modes.
 *
 * The crawl path is framework-agnostic — it walks rendered HTML and does not
 * care that Nuxt (not Next) produced it — so this is the same thin glue over
 * the shared `scolta` binding's in-process indexer, with `nuxt generate`'s
 * output dir as the default crawl target. No indexing/scoring/tokenizing logic
 * lives here; all of that is in `scolta`.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { ContentItem, index as scoltaIndex } from "scolta";
import { collectSource, type EnumeratedContent, type ScoltaContentSource } from "./content-source.js";
import type { NuxtScoltaConfig } from "./config.js";

const { IndexBuildOrchestrator, BuildIntent, MemoryBudget } = scoltaIndex;

export interface BuildOptions {
  mode?: "fresh" | "resume" | "restart";
  force?: boolean;
  source?: ScoltaContentSource;
  logger?: { info(m: string, ...a: unknown[]): void; warn(m: string, ...a: unknown[]): void; error(m: string, ...a: unknown[]): void };
}

/** Map a generate-output-relative HTML path to the URL Nuxt serves it at. */
export function exportPathToUrl(relPath: string): string {
  const p = relPath.replace(/\\/g, "/");
  if (p === "index.html") return "/";
  if (p.endsWith("/index.html")) return "/" + p.slice(0, -"/index.html".length) + "/";
  if (p.endsWith(".html")) return "/" + p.slice(0, -".html".length);
  return "/" + p;
}

/** Crawl rendered HTML files under `dir` into ContentItems. */
export function crawlStaticOutput(dir: string): ContentItem[] {
  const items: ContentItem[] = [];
  const walk = (d: string): void => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith(".html")) continue;
      const html = fs.readFileSync(full, "utf-8");
      const rel = path.relative(dir, full);
      const title = /<title>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? rel;
      items.push(new ContentItem({ id: rel, title, bodyHtml: html, url: exportPathToUrl(rel), date: "" }));
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return items;
}

export async function buildIndex(
  config: NuxtScoltaConfig,
  opts: BuildOptions = {},
): Promise<scoltaIndex.StatusReport> {
  let items: EnumeratedContent[];
  if (config.source === "content") {
    if (!opts.source) {
      throw new Error("source: 'content' requires a registered ScoltaContentSource passed to buildIndex({ source }).");
    }
    items = await collectSource(opts.source);
  } else {
    items = crawlStaticOutput(config.exportDir);
  }

  const orchestrator = new IndexBuildOrchestrator(config.stateDir, config.outputDir, { language: config.scolta.language });
  const budget = MemoryBudget.default();
  const mode = opts.mode ?? "fresh";
  const intent =
    mode === "resume"
      ? BuildIntent.resume(budget)
      : mode === "restart"
        ? BuildIntent.restart(items.length, budget)
        : BuildIntent.fresh(items.length, budget);

  return orchestrator.build(intent, items, opts.logger, undefined, opts.force ?? false);
}
