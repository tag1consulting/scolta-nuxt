/**
 * <ScoltaSearch> — a thin Vue client component that mounts the shared vanilla-JS
 * search widget (`scolta.js`, reused verbatim by every binding — Drupal and
 * WordPress use it too, so there is no Vue-specific search logic). It injects
 * the stylesheet + script and sets `window.scolta` from config, then renders the
 * container the widget hydrates into. Authored with a render function so no SFC
 * compiler is needed in the build.
 */

import { defineComponent, h, onMounted } from "vue";
import { buildWindowScolta } from "./bootstrap.js";

function ensureStylesheet(href: string): void {
  if (document.querySelector(`link[data-scolta][href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.setAttribute("data-scolta", "");
  document.head.appendChild(link);
}

function ensureScript(src: string): void {
  if (document.querySelector(`script[data-scolta][src="${src}"]`)) return;
  const script = document.createElement("script");
  script.src = src;
  script.type = "module";
  script.setAttribute("data-scolta", "");
  document.body.appendChild(script);
}

export const ScoltaSearch = defineComponent({
  name: "ScoltaSearch",
  props: {
    config: { type: Object, required: true },
    assetsPath: { type: String, default: "/scolta" },
    pagefindPath: { type: String, default: undefined },
    containerId: { type: String, default: "scolta-search" },
  },
  setup(props: { config: Record<string, unknown>; assetsPath: string; pagefindPath?: string; containerId: string }) {
    onMounted(() => {
      const base = props.assetsPath.replace(/\/$/, "");
      (window as unknown as { scolta?: unknown }).scolta = buildWindowScolta(props.config, {
        assetsPath: props.assetsPath,
        pagefindPath: props.pagefindPath,
        containerId: props.containerId,
      });
      ensureStylesheet(`${base}/css/scolta.css`);
      ensureScript(`${base}/js/scolta.js`);
    });
    return () => h("div", { id: props.containerId, "data-scolta-search": "" });
  },
});

export default ScoltaSearch;
export { buildWindowScolta, type BootstrapOptions } from "./bootstrap.js";
