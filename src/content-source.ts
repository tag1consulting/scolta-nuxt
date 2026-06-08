/**
 * Content-source protocol for server/hybrid Nuxt sites — identical to the
 * scolta-next interface (it is CMS-side, not framework-side). The
 * JSON:API / decoupled-Drupal worked example from scolta-next applies here
 * unchanged; this package does not duplicate it. Bring any source implementing
 * `enumerate()`.
 */

import type { ContentItem } from "scolta";
import { index as scoltaIndex } from "scolta";

/** Re-export for adapter consumers: yield these for unchanged entries. */
export const CachedContentReference = scoltaIndex.CachedContentReference;

export type EnumeratedContent = ContentItem | InstanceType<typeof scoltaIndex.CachedContentReference>;

export interface ScoltaContentSource {
  enumerate(): AsyncIterable<EnumeratedContent> | Iterable<EnumeratedContent>;
}

export async function collectSource(source: ScoltaContentSource): Promise<EnumeratedContent[]> {
  const out: EnumeratedContent[] = [];
  for await (const item of source.enumerate() as AsyncIterable<EnumeratedContent>) {
    out.push(item);
  }
  return out;
}
