import type { Entry, Toast, ViewMode } from "./types/entry.js"

export interface State {
  entries: Entry[]
  loadError: string | null
  loading: boolean
  /** Paths of collapsed groups. UI state, so it survives reloads. */
  collapsed: ReadonlySet<string>

  selectedIndex: number
  scrollOffset: number

  mode: ViewMode
  filterQuery: string
  /** Path being typed in insert mode. */
  draft: string

  /** Entry whose plaintext is on screen. Moving off it hides it implicitly. */
  revealedPath: string | null

  toast: Toast | null
}

export type Action =
  | { type: "loaded"; entries: Entry[]; error: string | null }
  | { type: "select"; index: number; rows: number; total: number }
  | { type: "mode"; mode: ViewMode }
  | { type: "filter"; query: string }
  | { type: "draft"; value: string }
  | { type: "toggle-group"; path: string }
  | { type: "reveal"; path: string | null }
  | { type: "toast"; toast: Toast | null }

export const initialState: State = {
  entries: [],
  loadError: null,
  loading: true,
  collapsed: new Set(),
  selectedIndex: 0,
  scrollOffset: 0,
  mode: "normal",
  filterQuery: "",
  draft: "",
  revealedPath: null,
  toast: null,
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "loaded":
      return {
        ...state,
        entries: action.entries,
        loadError: action.error,
        loading: false,
        selectedIndex: 0,
        scrollOffset: 0,
      }
    case "select": {
      // Every selection change goes through here: clamp the index, then
      // scroll the minimum amount that keeps it in the window.
      const { rows, total } = action
      const index = total === 0 ? 0 : clamp(action.index, 0, total - 1)
      const scrollOffset = clamp(
        clamp(state.scrollOffset, index - rows + 1, index),
        0,
        Math.max(0, total - rows)
      )
      if (index === state.selectedIndex && scrollOffset === state.scrollOffset) return state
      return { ...state, selectedIndex: index, scrollOffset }
    }
    case "mode":
      return { ...state, mode: action.mode, draft: "" }
    case "filter":
      return { ...state, filterQuery: action.query, selectedIndex: 0, scrollOffset: 0 }
    case "draft":
      return { ...state, draft: action.value }
    case "toggle-group": {
      const collapsed = new Set(state.collapsed)
      if (!collapsed.delete(action.path)) collapsed.add(action.path)
      return { ...state, collapsed }
    }
    case "reveal":
      return { ...state, revealedPath: action.path }
    case "toast":
      return { ...state, toast: action.toast }
  }
}

/** True if any ancestor group of `parent` (inclusive) is collapsed. */
export function isHidden(collapsed: ReadonlySet<string>, parent: string): boolean {
  for (let p = parent; p; p = p.slice(0, Math.max(0, p.lastIndexOf("/")))) {
    if (collapsed.has(p)) return true
  }
  return false
}
