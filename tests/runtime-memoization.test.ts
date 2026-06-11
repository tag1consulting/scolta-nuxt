/**
 * Per-request config/API construction is memoized by runtimeConfig identity:
 * Nitro hands every request the same runtimeConfig object, so resolving the
 * ~50-field config and wiring the AI service must happen once per config, not
 * once per request. (`#imports`/`h3` are stubbed via vitest aliases.)
 */

import { describe, expect, it } from "vitest";
import { __setRuntimeConfig } from "./support/imports-stub.js";
import { useScoltaApi } from "../src/runtime/util.js";

describe("useScoltaApi memoization", () => {
  it("two calls under the same runtimeConfig return the same instance", () => {
    __setRuntimeConfig({ scolta: { site_name: "Memo Site" } });
    const first = useScoltaApi();
    const second = useScoltaApi();
    expect(second).toBe(first);
  });

  it("a different runtimeConfig identity gets a fresh instance", () => {
    __setRuntimeConfig({ scolta: { site_name: "A" } });
    const a = useScoltaApi();
    __setRuntimeConfig({ scolta: { site_name: "A" } }); // equal contents, new object
    const b = useScoltaApi();
    expect(b).not.toBe(a);
  });

  it("the memoized API serves requests", async () => {
    __setRuntimeConfig({ scolta: {} });
    const health = await useScoltaApi().health();
    expect(["ok", "degraded"]).toContain(health["status"]);
  });
});
