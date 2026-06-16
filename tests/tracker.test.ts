/** ScoltaTracker: debounced rebuild gated on autoRebuild (parity with scolta-next). */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NuxtScoltaConfig } from "../src/config.js";
import { ScoltaTracker, createScoltaTracker } from "../src/tracker.js";
// core is the framework-free public surface; the module entry (`scolta-nuxt`)
// re-exports it verbatim via `export * from "./core.js"`. Asserting it here keeps
// the check off `@nuxt/kit` (which the module entry value-imports).
import * as publicEntry from "../src/core.js";

const longBody = "<p>" + "This paragraph is long enough to pass the minimum content length filter. ".repeat(4) + "</p>";

describe("ScoltaTracker debounce (fake timers)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("touch() schedules a single debounced rebuild only when autoRebuild is true", async () => {
    const rebuild = vi.fn();
    const config = NuxtScoltaConfig.fromObject({ autoRebuild: true, autoRebuildDelay: 2000 });
    const tracker = new ScoltaTracker(config, { rebuild });

    tracker.touch("a");
    tracker.touch("b");
    expect(tracker.pending()).toEqual(["a", "b"]);
    expect(tracker.isScheduled()).toBe(true);
    expect(rebuild).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2000);
    expect(rebuild).toHaveBeenCalledTimes(1); // fires once, not once per touch
    expect(tracker.isScheduled()).toBe(false);
    expect(tracker.pending()).toEqual([]); // cleared on rebuild
  });

  it("autoRebuild:false records touches but never schedules a rebuild", async () => {
    const rebuild = vi.fn();
    const config = NuxtScoltaConfig.fromObject({ autoRebuild: false });
    const tracker = new ScoltaTracker(config, { rebuild });

    tracker.touch("a");
    expect(tracker.pending()).toEqual(["a"]);
    expect(tracker.isScheduled()).toBe(false);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(rebuild).not.toHaveBeenCalled();
  });

  it("flushNow() runs immediately and cancels the pending timer", async () => {
    const rebuild = vi.fn();
    const config = NuxtScoltaConfig.fromObject({ autoRebuild: true, autoRebuildDelay: 2000 });
    const tracker = new ScoltaTracker(config, { rebuild });

    tracker.touch("a");
    expect(tracker.isScheduled()).toBe(true);
    await tracker.flushNow();
    expect(rebuild).toHaveBeenCalledTimes(1);
    expect(tracker.isScheduled()).toBe(false);

    await vi.advanceTimersByTimeAsync(2000); // the cancelled timer must not re-fire
    expect(rebuild).toHaveBeenCalledTimes(1);
  });

  it("a throwing rebuild is caught and logged, not propagated", async () => {
    const error = vi.fn();
    const config = NuxtScoltaConfig.fromObject({ autoRebuild: true });
    const tracker = new ScoltaTracker(config, {
      rebuild: () => {
        throw new Error("boom");
      },
      logger: { info() {}, error },
    });

    await expect(tracker.flushNow()).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledOnce();
  });
});

describe("public entry parity with scolta-next", () => {
  it("re-exports ScoltaTracker + createScoltaTracker", () => {
    expect(typeof publicEntry.ScoltaTracker).toBe("function");
    expect(typeof publicEntry.createScoltaTracker).toBe("function");
  });
});

describe("createScoltaTracker default rebuild", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "scolta-tracker-"));
  });
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("defaults rebuild to this package's buildIndex (writes a pagefind index)", async () => {
    const exportDir = path.join(tmp, "public");
    fs.mkdirSync(exportDir, { recursive: true });
    fs.writeFileSync(
      path.join(exportDir, "index.html"),
      `<html><head><title>Home</title></head><body>${longBody}</body></html>`,
    );
    const config = NuxtScoltaConfig.fromObject({
      source: "static-export",
      autoRebuild: true,
      exportDir,
      outputDir: path.join(tmp, "out"),
      stateDir: path.join(tmp, "state"),
    });
    const tracker = createScoltaTracker(config);
    tracker.touch("index.html");
    await tracker.flushNow();
    expect(fs.existsSync(path.join(tmp, "out", "pagefind", "pagefind-entry.json"))).toBe(true);
  });

  it("uses an explicit rebuild override when provided", async () => {
    const rebuild = vi.fn();
    const config = NuxtScoltaConfig.fromObject({ autoRebuild: true });
    const tracker = createScoltaTracker(config, { rebuild });
    await tracker.flushNow();
    expect(rebuild).toHaveBeenCalledTimes(1);
  });
});
