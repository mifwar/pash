import { useEffect, useRef, useState } from "react"
import { passShow, parseEntry, type ParsedEntry } from "../utils/pass.js"

export type PreviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; parsed: ParsedEntry }
  | { status: "error"; error: string }

const CACHE_MAX = 32
/** Holding j/k shouldn't spawn a gpg decrypt for every row passed. */
const DEBOUNCE_MS = 150

const IDLE: PreviewState = { status: "idle" }
const LOADING: PreviewState = { status: "loading" }

/**
 * Decrypt `path` (debounced, cached) and return its state. Everything
 * is derived from `path`, so there is no reset logic when it changes.
 * Errors aren't cached: revisiting a failed entry retries.
 */
export function usePreview(path: string | null): PreviewState {
  const cache = useRef(new Map<string, ParsedEntry>())
  const [failure, setFailure] = useState<{ path: string; error: string } | null>(null)
  // Bumped when a decrypt lands so the cache read below re-runs.
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!path || cache.current.has(path)) return
    setFailure((f) => (f?.path === path ? null : f)) // retrying: show loading, not the stale error
    let cancelled = false
    const timer = setTimeout(() => {
      passShow(path).then(
        (body) => {
          const c = cache.current
          if (c.size >= CACHE_MAX) c.delete(c.keys().next().value!)
          c.set(path, parseEntry(body))
          if (!cancelled) setTick((t) => t + 1)
        },
        (err) => {
          if (!cancelled)
            setFailure({ path, error: err instanceof Error ? err.message : String(err) })
        }
      )
    }, DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [path])

  if (!path) return IDLE
  const parsed = cache.current.get(path)
  if (parsed) return { status: "ready", parsed }
  if (failure?.path === path) return { status: "error", error: failure.error }
  return LOADING
}
