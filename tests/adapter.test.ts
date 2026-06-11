/** scolta-nuxt adapter: config round-trip, build modes, Nitro handler logic, bootstrap. */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ContentItem, ai, index as scoltaIndex } from "scolta";
import { NuxtScoltaConfig } from "../src/config.js";
import { buildIndex, crawlStaticOutput, exportPathToUrl } from "../src/build.js";
import { createScoltaApi } from "../src/handlers.js";
import { buildWindowScolta } from "../src/bootstrap.js";
import type { ScoltaContentSource } from "../src/content-source.js";

const silent = { info() {}, warn() {}, error() {} };
const longBody = "<p>" + "This paragraph is long enough to pass the minimum content length filter. ".repeat(4) + "</p>";

let tmp: string;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "scolta-nuxt-"));
});
afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

function writeOutput(dir: string): void {
  fs.mkdirSync(path.join(dir, "about"), { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), `<html><head><title>Home</title></head><body>${longBody}</body></html>`);
  fs.writeFileSync(path.join(dir, "about", "index.html"), `<html><head><title>About</title></head><body>${longBody}</body></html>`);
}

describe("config round-trip (Release Gate family 4)", () => {
  it("browser config reflects SAVED values", () => {
    const config = NuxtScoltaConfig.fromObject({ site_name: "Nuxt Site", results_per_page: 9 });
    const b = config.toBrowserConfig();
    expect(b["siteName"]).toBe("Nuxt Site");
    expect((b["scoring"] as any)["RESULTS_PER_PAGE"]).toBe(9);
  });

  it("fromEnv reads SCOLTA_API_KEY", () => {
    const c = NuxtScoltaConfig.fromEnv({}, { SCOLTA_API_KEY: "sk-env" } as any);
    expect(c.scolta.ai_api_key).toBe("sk-env");
  });

  it("default output dir is nuxt generate target", () => {
    expect(new NuxtScoltaConfig().exportDir).toBe(".output/public");
    expect(new NuxtScoltaConfig().outputDir).toBe(".output/public");
  });
});

describe("static-output crawl + build", () => {
  it.each([
    ["index.html", "/"],
    ["about/index.html", "/about/"],
    ["posts/hello.html", "/posts/hello"],
  ])("exportPathToUrl %s -> %s", (rel, url) => {
    expect(exportPathToUrl(rel)).toBe(url);
  });

  it("crawls rendered HTML and builds a valid index", async () => {
    const dir = path.join(tmp, "output");
    writeOutput(dir);
    expect(crawlStaticOutput(dir).length).toBe(2);
    const config = NuxtScoltaConfig.fromObject({
      source: "static-export",
      exportDir: dir,
      outputDir: path.join(tmp, "out"),
      stateDir: path.join(tmp, "state"),
    });
    const report = await buildIndex(config, { logger: silent });
    expect(report.success).toBe(true);
    expect(report.pagesProcessed).toBe(2);
    expect(fs.existsSync(path.join(tmp, "out", "pagefind", "pagefind-entry.json"))).toBe(true);
  });
});

describe("content-source build hits the token cache", () => {
  it("second build re-tokenizes zero unchanged items", async () => {
    const items = [
      new ContentItem({ id: "a", title: "Alpha", bodyHtml: longBody, url: "/a", date: "2024-01-01" }),
      new ContentItem({ id: "b", title: "Beta", bodyHtml: longBody, url: "/b", date: "2024-01-01" }),
    ];
    const source: ScoltaContentSource = {
      enumerate() {
        return items;
      },
    };
    const config = NuxtScoltaConfig.fromObject({ source: "content", outputDir: path.join(tmp, "out"), stateDir: path.join(tmp, "state") });
    const proto = scoltaIndex.InvertedIndexBuilder.prototype;
    const original = proto.tokenizeItem;
    const calls: string[] = [];
    proto.tokenizeItem = function (item: any) {
      calls.push(item.id);
      return original.call(this, item);
    };
    try {
      await buildIndex(config, { source, logger: silent });
      expect(calls.length).toBe(2);
      calls.length = 0;
      await buildIndex(config, { source, logger: silent });
      expect(calls).toEqual([]);
    } finally {
      proto.tokenizeItem = original;
    }
  });
});

describe("Nitro AI handler logic (createScoltaApi)", () => {
  function fakeService(response: string): ai.AiServiceLike {
    return {
      getExpandPrompt: () => "expand",
      getSummarizePrompt: () => "summarize",
      getFollowUpPrompt: () => "follow",
      message: async () => response,
      conversation: async () => response,
      messageForOperation: async () => response,
    };
  }

  it("expandQuery returns ok + terms", async () => {
    const api = createScoltaApi(NuxtScoltaConfig.fromObject({}), { aiService: fakeService('["t1","t2","t3"]'), logger: silent });
    const r = await api.expandQuery({ query: "test" });
    expect(r.ok).toBe(true);
    expect((r.data as any).terms).toEqual(["t1", "t2", "t3"]);
  });

  it("followUp validates messages", async () => {
    const api = createScoltaApi(NuxtScoltaConfig.fromObject({}), { aiService: fakeService("reply"), logger: silent });
    expect((await api.followUp({ messages: [] })).status).toBe(400);
    const ok = await api.followUp({ messages: [{ role: "user", content: "hi" }] });
    expect((ok.data as any).response).toBe("reply");
  });

  it("health is status-only by default — monitors get the status, no diagnostics", async () => {
    const api = createScoltaApi(NuxtScoltaConfig.fromObject({ results_per_page: 21 }));
    const h = await api.health();
    expect(Object.keys(h)).toEqual(["status"]);
    expect(["ok", "degraded"]).toContain(h["status"]);
  });

  it("health reflects saved scoring when healthDetail is enabled", async () => {
    const api = createScoltaApi(NuxtScoltaConfig.fromObject({ results_per_page: 21, healthDetail: true }));
    const h = await api.health();
    expect((h["scoring"] as any).RESULTS_PER_PAGE).toBe(21);
  });
});

describe("buildWindowScolta", () => {
  it("reflects config and derives wasmPath glue module", () => {
    const config = NuxtScoltaConfig.fromObject({ site_name: "Acme" });
    const win = buildWindowScolta(config.toBrowserConfig(), { assetsPath: "/scolta" });
    expect(win["siteName"]).toBe("Acme");
    expect(win["wasmPath"]).toBe("/scolta/wasm/scolta_core.js");
  });

  it("names the mount container so scolta.js auto-init does not bail", () => {
    expect(buildWindowScolta({})["container"]).toBe("#scolta-search");
    expect(buildWindowScolta({}, { containerId: "my-box" })["container"]).toBe("#my-box");
  });
});
