import Fuse from "fuse.js"
import type { Entry } from "../types/entry.js"

/** A list row: the entry plus, in search results, matched `[start, end]` ranges of its path. */
export type Row = { entry: Entry; matches?: ReadonlyArray<readonly [number, number]> }

/**
 * Build a fuse.js index over entries only (groups aren't copyable, so
 * they're noise in search results).
 *
 * Weighting per pash.md spec:
 * - path: 0.7 (most specific, what the user types)
 * - name: 0.3 (last path segment)
 */
export function buildFuse(entries: Entry[]): Fuse<Entry> {
  return new Fuse(
    entries.filter((e) => e.kind === "entry"),
    {
      keys: [
        { name: "path", weight: 0.7 },
        { name: "name", weight: 0.3 },
      ],
      threshold: 0.4,
      ignoreLocation: true,
      isCaseSensitive: false,
      includeMatches: true,
    }
  )
}

/** Ranked search results as a flat list, with path match ranges for highlighting. */
export function search(fuse: Fuse<Entry>, query: string): Row[] {
  return fuse.search(query).map((r) => ({
    entry: r.item,
    matches: r.matches?.find((m) => m.key === "path")?.indices,
  }))
}
