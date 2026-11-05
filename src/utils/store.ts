import { readdir, stat } from "fs/promises"
import type { Dirent } from "fs"
import { join } from "path"
import type { Entry, StoreLoadResult } from "../types/entry.js"

/**
 * Walk a `pass` store root and produce a flat list of entries + groups.
 *
 * Detection rules (per pash.md spec):
 * - Entry: any file ending in `.gpg` (hidden files skipped)
 * - Group: any directory containing a `.gpg-id` AND at least one
 *   `.gpg` file in its subtree. Empty directories are pruned so the
 *   tree view doesn't show dead rows.
 *
 * Order: **DFS, parent-before-children**. Top-level groups are emitted
 * alphabetically, each followed by its (recursively walked) subtree,
 * then top-level entries. We do NOT depth-sort at the end — the walk
 * preserves tree order on its own.
 *
 * We walk manually (no `recursive: true`) so the Dirent names are
 * string-typed; with `recursive: true` Node returns Dirent<Buffer>
 * which clashes with the string-only helpers below.
 */
export async function loadStore(root: string): Promise<StoreLoadResult> {
  try {
    await stat(root)
  } catch {
    return { entries: [], root, error: `Store not found at ${root}` }
  }

  const entries: Entry[] = []

  async function walk(dir: string, depth: number, parent: string): Promise<number> {
    let items: Dirent<string>[]
    try {
      items = await readdir(dir, { withFileTypes: true })
    } catch {
      return 0
    }

    let childCount = 0

    // Subdirs: emit as groups, recurse to populate children
    const subdirs = items
      .filter((i) => i.isDirectory() && !i.name.startsWith("."))
      .map((i) => i.name)
      .sort()

    for (const sub of subdirs) {
      const subAbs = join(dir, sub)
      const subRel = parent ? `${parent}/${sub}` : sub

      // Placeholder, recurse, then decide: keep as group if the
      // subtree contributed any rows, drop if empty.
      const placeholderIdx = entries.length
      entries.push({
        path: subRel,
        name: sub,
        parent,
        depth,
        kind: "group",
        absPath: subAbs,
      })
      if ((await walk(subAbs, depth + 1, subRel)) > 0) {
        childCount++
      } else {
        // Empty group (or recursive-only-empty) — prune
        entries.splice(placeholderIdx, 1)
      }
    }

    // Entries
    const gpgFiles = items
      .filter((i) => i.isFile() && i.name.endsWith(".gpg"))
      .map((i) => i.name)
      .sort()

    for (const file of gpgFiles) {
      const stem = file.replace(/\.gpg$/, "")
      const entryPath = parent ? `${parent}/${stem}` : stem
      entries.push({
        path: entryPath,
        name: stem,
        parent,
        depth,
        kind: "entry",
        absPath: join(dir, file),
      })
      childCount++
    }

    return childCount
  }

  await walk(root, 0, "")

  return { entries, root, error: null }
}
