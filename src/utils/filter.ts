import Fuse from "fuse.js"
import type { Entry } from "../types/entry.js"

/**
 * Build a fuse.js instance over the entry list.
 *
 * Weighting per pash.md spec:
 * - path: 0.7 (most specific, what the user types)
 * - name: 0.3 (last path segment)
 *
 * Frontmatter keys are deferred to v0.2 (no frontmatter parsing in v0.1).
 */
export function buildFuse(entries: Entry[]): Fuse<Entry> {
  return new Fuse(entries, {
    keys: [
      { name: "path", weight: 0.7 },
      { name: "name", weight: 0.3 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
    isCaseSensitive: false,
  })
}

/** Apply a filter query. Empty query returns the full list unchanged. */
export function applyFilter(fuse: Fuse<Entry>, entries: Entry[], query: string): Entry[] {
  if (!query) return entries
  return fuse.search(query).map((r) => r.item)
}
