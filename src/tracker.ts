/**
 * Content-change maintenance: a change tracker + debounced rebuild.
 *
 * This is the helper the `autoRebuild` / `autoRebuildDelay` config knobs
 * configure. `touch(key)` records a change and schedules a debounced rebuild
 * that reuses the token cache (so only changed pages re-tokenize). Gated on
 * `autoRebuild`, timed by `autoRebuildDelay`. Wire `touch()` to your
 * content-change events (a CMS save webhook, a Nitro server route, a watcher).
 *
 * In-process debounce needs a long-running process: it works under Nuxt's
 * server/SSR mode, but a static `nuxt generate` (or a serverless deploy) has no
 * shared in-process timer across invocations — trigger rebuilds via webhook/CI
 * there instead. This mirrors the {@link ScoltaTracker} shipped by scolta-next,
 * whose Payload `afterChange`/`afterDelete` hooks are a reference wiring; bulk
 * writes that bypass the hooks need a manual `npx scolta-build`.
 */

import { buildIndex } from "./build.js";
import type { NuxtScoltaConfig } from "./config.js";
import type { ScoltaContentSource } from "./content-source.js";

export interface TrackerOptions {
  /** Run the rebuild. Should reuse the token cache (BuildIntent.fresh, no force). */
  rebuild: () => Promise<void> | void;
  logger?: { info(m: string, ...a: unknown[]): void; error(m: string, ...a: unknown[]): void };
}

export class ScoltaTracker {
  private readonly touched = new Set<string>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly config: NuxtScoltaConfig,
    private readonly opts: TrackerOptions,
  ) {}

  /** Record a changed entity and schedule a debounced rebuild. */
  touch(key: string): void {
    this.touched.add(key);
    this.schedule();
  }

  pending(): string[] {
    return [...this.touched];
  }

  clear(): void {
    this.touched.clear();
  }

  /** True if a rebuild is currently scheduled (pending the debounce window). */
  isScheduled(): boolean {
    return this.timer !== null;
  }

  private schedule(): void {
    if (!this.config.autoRebuild) return;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.runRebuild(), this.config.autoRebuildDelay);
    // Don't keep the event loop alive for a background rebuild.
    (this.timer as { unref?: () => void }).unref?.();
  }

  /** Run the rebuild immediately (used by tests and by an explicit flush). */
  async flushNow(): Promise<void> {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await this.runRebuild();
  }

  private async runRebuild(): Promise<void> {
    this.timer = null;
    this.touched.clear();
    try {
      await this.opts.rebuild();
    } catch (err) {
      this.opts.logger?.error("[scolta] Rebuild failed:", err);
    }
  }
}

export interface CreateTrackerOptions extends Partial<TrackerOptions> {
  /**
   * Content source for `source: "content"` mode — required there for the
   * default rebuild (ignored under the static-output crawl).
   */
  source?: ScoltaContentSource;
}

/**
 * Build a {@link ScoltaTracker} whose default `rebuild` reuses the token cache
 * (BuildIntent.fresh, no force) via this package's {@link buildIndex}. Pass an
 * explicit `rebuild` to override it (e.g. to fan out to a framework hook).
 */
export function createScoltaTracker(
  config: NuxtScoltaConfig,
  opts: CreateTrackerOptions = {},
): ScoltaTracker {
  const rebuild =
    opts.rebuild ??
    (async (): Promise<void> => {
      await buildIndex(config, { source: opts.source });
    });
  return new ScoltaTracker(config, { rebuild, logger: opts.logger });
}
