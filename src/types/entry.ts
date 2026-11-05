/**
 * Flat representation of a `pass` store entry or group, post-walk.
 *
 * The store on disk is a tree; we flatten to an array (sorted
 * groups-before-entries, alphabetical within a level) so the list view
 * can render with simple index-based selection. `depth` and `parent`
 * preserve enough structure for indented rendering.
 */
export type Entry = {
  /** Path relative to the store root, e.g. "cloud/aws/prod" */
  path: string
  /** Final path segment, e.g. "prod" */
  name: string
  /** Parent path, e.g. "cloud/aws", or "" for top-level */
  parent: string
  /** 0 for top-level, 1 for first nested, etc. */
  depth: number
  /** "group" = directory with at least one entry below it; "entry" = .gpg file */
  kind: "group" | "entry"
  /** Absolute path on disk */
  absPath: string
}

export type ViewMode = "normal" | "filter" | "help" | "insert"

export type Toast = {
  text: string
  kind: "info" | "success" | "error"
}

export type StoreLoadResult = {
  entries: Entry[]
  root: string
  error: string | null
}
