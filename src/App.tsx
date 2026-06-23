import React, { useEffect, useMemo, useReducer, useCallback, useRef, useState } from "react"
import { Box, Text, useInput, useStdout } from "ink"
import { Header } from "./components/Header.js"
import { EntryList } from "./components/EntryList.js"
import { Preview } from "./components/Preview.js"
import { HelpBar } from "./components/HelpBar.js"
import { HelpModal } from "./components/HelpModal.js"
import { Toast } from "./components/Toast.js"
import { FilterInput } from "./components/FilterInput.js"
import { InsertInput } from "./components/InsertInput.js"
import { loadStore } from "./utils/store.js"
import { passShow, passGenerate, parseEntry, type ParsedEntry } from "./utils/pass.js"
import { resolvePassc, transientCopy } from "./utils/clipboard.js"
import { buildFuse, applyFilter } from "./utils/filter.js"
import { resolveStoreRoot } from "./utils/xdg.js"
import type { Entry, Toast as ToastT, ViewMode } from "./types/entry.js"
import { theme } from "./utils/theme.js"

interface Props {
  onExit: () => void
  storeRoot: string
}

interface State {
  // Store
  entries: Entry[]
  storeRoot: string
  loadError: string | null
  loading: boolean

  // Navigation
  selectedIndex: number
  scrollOffset: number

  // Filter
  mode: ViewMode
  filterQuery: string
  /** When true, the filter is applied even in normal mode (sticky after Enter) */
  filterSticky: boolean

  // Preview
  previewPath: string | null
  previewParsed: ParsedEntry | null
  previewLoading: boolean
  previewError: string | null
  /** True = render the full decrypted body. False = metadata only. */
  previewExpanded: boolean

  // Toast
  toast: ToastT | null
}

type Action =
  | { type: "store-loaded"; entries: Entry[]; root: string; error: string | null }
  | { type: "navigate"; direction: "up" | "down"; max: number; total: number }
  | { type: "jump-top" }
  | { type: "jump-bottom"; max: number; total: number }
  | { type: "select"; index: number }
  | { type: "enter-mode"; mode: ViewMode }
  | { type: "set-filter"; query: string; sticky: boolean }
  | { type: "clear-filter" }
  | { type: "preview-start"; path: string }
  | { type: "preview-success"; path: string; parsed: ParsedEntry }
  | { type: "preview-fail"; error: string }
  | { type: "preview-toggle" }
  | { type: "preview-collapse" }
  | { type: "toast"; toast: ToastT }
  | { type: "toast-clear" }
  | { type: "toggle-expand"; path: string }

const TOAST_TTL_MS = 3000
const PREVIEW_CACHE_MAX = 32

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "store-loaded":
      return {
        ...state,
        entries: action.entries,
        storeRoot: action.root,
        loadError: action.error,
        loading: false,
        selectedIndex: 0,
        scrollOffset: 0,
      }
    case "navigate": {
      const { direction, max, total } = action
      if (total === 0) return state
      const next = direction === "down" ? state.selectedIndex + 1 : state.selectedIndex - 1
      const clamped = Math.max(0, Math.min(next, total - 1))
      let scroll = state.scrollOffset
      if (clamped < scroll) scroll = clamped
      else if (clamped >= scroll + max) scroll = clamped - max + 1
      scroll = Math.max(0, Math.min(scroll, Math.max(0, total - max)))
      return { ...state, selectedIndex: clamped, scrollOffset: scroll }
    }
    case "jump-top":
      return { ...state, selectedIndex: 0, scrollOffset: 0 }
    case "jump-bottom": {
      const { max, total } = action
      const last = Math.max(0, total - 1)
      return {
        ...state,
        selectedIndex: last,
        scrollOffset: Math.max(0, total - max),
      }
    }
    case "select":
      return { ...state, selectedIndex: action.index }
    case "enter-mode":
      return { ...state, mode: action.mode }
    case "set-filter":
      return {
        ...state,
        filterQuery: action.query,
        filterSticky: action.sticky,
        selectedIndex: 0,
        scrollOffset: 0,
      }
    case "clear-filter":
      return {
        ...state,
        filterQuery: "",
        filterSticky: false,
        selectedIndex: 0,
        scrollOffset: 0,
      }
    case "preview-start":
      return {
        ...state,
        previewPath: action.path,
        previewParsed: null,
        previewLoading: true,
        previewError: null,
        previewExpanded: false,
      }
    case "preview-success":
      return {
        ...state,
        previewPath: action.path,
        previewParsed: action.parsed,
        previewLoading: false,
        previewError: null,
      }
    case "preview-fail":
      return {
        ...state,
        previewLoading: false,
        previewError: action.error,
      }
    case "preview-toggle":
      return { ...state, previewExpanded: !state.previewExpanded }
    case "preview-collapse":
      // Selection moved away — never leave preview expanded on the
      // wrong entry. Selection of a new entry re-fires preview-start
      // which also collapses.
      return { ...state, previewExpanded: false }
    case "toast":
      return { ...state, toast: action.toast }
    case "toast-clear":
      return { ...state, toast: null }
    case "toggle-expand": {
      const entries = state.entries.map((e) =>
        e.path === action.path ? { ...e, expanded: !e.expanded } : e
      )
      return { ...state, entries }
    }
    default:
      return state
  }
}

const initialState: State = {
  entries: [],
  storeRoot: "",
  loadError: null,
  loading: true,
  selectedIndex: 0,
  scrollOffset: 0,
  mode: "normal",
  filterQuery: "",
  filterSticky: false,
  previewPath: null,
  previewParsed: null,
  previewLoading: false,
  previewError: null,
  previewExpanded: false,
  toast: null,
}

export function App({ onExit, storeRoot }: Props) {
  const { stdout } = useStdout()
  const width = stdout?.columns ?? 100
  const height = stdout?.rows ?? 24

  const [state, dispatch] = useReducer(reducer, initialState)

  // Passc binary resolved once on mount
  const [passcBin, setPasscBin] = useState<string | null>(null)
  useEffect(() => {
    resolvePassc().then(setPasscBin)
  }, [])

  // Insert-new-entry input — ephemeral, not part of the reducer
  const [insertQuery, setInsertQuery] = useState("")

  // Load the store on mount
  useEffect(() => {
    let cancelled = false
    loadStore(storeRoot).then((res) => {
      if (cancelled) return
      dispatch({
        type: "store-loaded",
        entries: res.entries,
        root: res.root,
        error: res.error,
      })
    })
    return () => {
      cancelled = true
    }
  }, [storeRoot])

  // Toast auto-clear
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showToast = useCallback((toast: ToastT) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    dispatch({ type: "toast", toast })
    toastTimer.current = setTimeout(() => {
      dispatch({ type: "toast-clear" })
    }, TOAST_TTL_MS)
  }, [])

  // Fuse over the live entry list
  const fuse = useMemo(() => buildFuse(state.entries), [state.entries])

  // Visible list = filter applied (if any) + collapsed groups hidden
  const visibleEntries = useMemo<Entry[]>(() => {
    const filtered = applyFilter(fuse, state.entries, state.filterQuery)
    // Hide entries under collapsed groups
    const result: Entry[] = []
    const collapsedAncestors: string[] = []
    for (const e of filtered) {
      // If any ancestor is collapsed, skip
      let hide = false
      for (const collapsed of collapsedAncestors) {
        if (e.path === collapsed || e.path.startsWith(collapsed + "/")) {
          hide = true
          break
        }
      }
      if (hide) continue
      result.push(e)
      if (e.kind === "group" && !e.expanded) {
        collapsedAncestors.push(e.path)
      }
    }
    return result
  }, [state.entries, state.filterQuery, fuse])

  // Bounds-check selection when the visible list changes shape
  useEffect(() => {
    if (visibleEntries.length === 0) return
    if (state.selectedIndex >= visibleEntries.length) {
      dispatch({ type: "select", index: visibleEntries.length - 1 })
    }
  }, [visibleEntries.length, state.selectedIndex])

  // The currently selected row
  const selected = visibleEntries[state.selectedIndex] ?? null

  // Layout: header(1) + [filter(1)] + [insert(1)] + [toast(1)] + list(flex) + help(1)
  const filterRow = state.mode === "filter" || state.filterSticky ? 1 : 0
  const insertRow = state.mode === "insert" ? 1 : 0
  const toastRow = state.toast ? 1 : 0
  const helpRow = 1
  const listHeight = Math.max(1, height - 1 - filterRow - insertRow - toastRow - helpRow)

  // Lazy preview loading.
  //
  // We always decrypt on entry selection (so the metadata pane can
  // show login / url / email for disambiguation) but only RENDER the
  // decrypted body when the user has toggled `p`. The cached ParsedEntry
  // carries both frontmatter and body; the Preview component decides
  // what to show based on `state.previewExpanded`.
  //
  // When the selection moves, preview is always collapsed — never
  // leave the previous entry's password visible on a new selection.
  const previewCache = useRef<Map<string, ParsedEntry>>(new Map())
  useEffect(() => {
    if (!selected || selected.kind !== "entry") {
      if (state.previewPath !== null) {
        dispatch({ type: "preview-start", path: "" })
      }
      return
    }
    if (state.previewPath === selected.path && state.previewParsed) {
      // Re-selecting the same entry — keep expansion state
      return
    }
    const cached = previewCache.current.get(selected.path)
    if (cached) {
      dispatch({ type: "preview-start", path: selected.path })
      dispatch({ type: "preview-success", path: selected.path, parsed: cached })
      return
    }
    let cancelled = false
    dispatch({ type: "preview-start", path: selected.path })
    passShow(selected.path)
      .then((body) => {
        if (cancelled) return
        const parsed = parseEntry(body)
        // Simple LRU-ish: drop oldest if over cap
        if (previewCache.current.size >= PREVIEW_CACHE_MAX) {
          const firstKey = previewCache.current.keys().next().value
          if (firstKey) previewCache.current.delete(firstKey)
        }
        previewCache.current.set(selected.path, parsed)
        dispatch({ type: "preview-success", path: selected.path, parsed })
      })
      .catch((err) => {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : String(err)
        dispatch({ type: "preview-fail", error: msg })
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.path, selected?.kind])

  // Reload handler
  const reload = useCallback(() => {
    loadStore(storeRoot).then((res) => {
      dispatch({
        type: "store-loaded",
        entries: res.entries,
        root: res.root,
        error: res.error,
      })
      showToast({ text: "Reloaded store", kind: "success" })
    })
  }, [storeRoot, showToast])

  // Copy handler
  const copySelected = useCallback(async () => {
    if (!selected || selected.kind !== "entry") {
      showToast({ text: "Select an entry to copy", kind: "info" })
      return
    }
    if (!passcBin) {
      showToast({
        text: "passc not found — install it or set $PASH_PASSC",
        kind: "error",
      })
      return
    }
    const result = await transientCopy(passcBin, selected.path)
    if (result.ok) {
      const secs = result.clearIn ?? 45
      showToast({
        text: `Copied ${selected.path} (auto-clear in ${secs}s)`,
        kind: "success",
      })
    } else {
      showToast({ text: `Copy failed: ${result.error ?? "unknown"}`, kind: "error" })
    }
  }, [selected, passcBin, showToast])

  // Insert handler — calls `pass generate <path>` then reloads the store.
  const insertEntry = useCallback(async () => {
    const path = insertQuery.trim()
    if (!path) {
      showToast({ text: "Path cannot be empty", kind: "error" })
      return
    }
    if (/\s/.test(path)) {
      showToast({ text: "Path cannot contain whitespace", kind: "error" })
      return
    }
    try {
      await passGenerate(path)
      // Reload + toast + exit mode in one go. Clear query so a follow-up
      // `i` starts fresh.
      setInsertQuery("")
      dispatch({ type: "enter-mode", mode: "normal" })
      loadStore(storeRoot).then((res) => {
        dispatch({
          type: "store-loaded",
          entries: res.entries,
          root: res.root,
          error: res.error,
        })
      })
      showToast({ text: `Created ${path}`, kind: "success" })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      showToast({ text: `Insert failed: ${msg}`, kind: "error" })
    }
  }, [insertQuery, storeRoot, showToast])
  useInput((input, key) => {
    // Help mode: any key closes
    if (state.mode === "help") {
      if (key.escape || input === "?" || input === "q") {
        dispatch({ type: "enter-mode", mode: "normal" })
      }
      return
    }

    // Insert mode: capture path input, submit on Enter, cancel on Esc
    if (state.mode === "insert") {
      if (key.escape) {
        setInsertQuery("")
        dispatch({ type: "enter-mode", mode: "normal" })
        return
      }
      if (key.return) {
        insertEntry()
        return
      }
      if (key.backspace || key.delete) {
        setInsertQuery((q) => q.slice(0, -1))
        return
      }
      if (input && input.length === 1 && !key.ctrl && !key.meta) {
        setInsertQuery((q) => q + input)
        return
      }
      return
    }

    // Filter mode: capture text input
    if (state.mode === "filter") {
      if (key.escape) {
        dispatch({ type: "clear-filter" })
        dispatch({ type: "enter-mode", mode: "normal" })
        return
      }
      if (key.return) {
        // Apply: exit filter input mode but keep query sticky
        dispatch({ type: "set-filter", query: state.filterQuery, sticky: true })
        dispatch({ type: "enter-mode", mode: "normal" })
        return
      }
      if (key.backspace || key.delete) {
        dispatch({ type: "set-filter", query: state.filterQuery.slice(0, -1), sticky: false })
        return
      }
      if (input && input.length === 1 && !key.ctrl && !key.meta) {
        dispatch({ type: "set-filter", query: state.filterQuery + input, sticky: false })
        return
      }
      return
    }

    // Normal mode
    if (input === "q" || (key.ctrl && input === "c")) {
      onExit()
      return
    }
    if (input === "?") {
      dispatch({ type: "enter-mode", mode: "help" })
      return
    }
    if (input === "/") {
      dispatch({ type: "enter-mode", mode: "filter" })
      return
    }
    if (input === "i") {
      setInsertQuery("")
      dispatch({ type: "enter-mode", mode: "insert" })
      return
    }
    if (input === "R") {
      reload()
      return
    }
    if (key.escape) {
      if (state.filterSticky) {
        dispatch({ type: "clear-filter" })
      }
      return
    }
    if (input === "j" || key.downArrow) {
      dispatch({
        type: "navigate",
        direction: "down",
        max: listHeight,
        total: visibleEntries.length,
      })
      return
    }
    if (input === "k" || key.upArrow) {
      dispatch({
        type: "navigate",
        direction: "up",
        max: listHeight,
        total: visibleEntries.length,
      })
      return
    }
    if (input === "g") {
      dispatch({ type: "jump-top" })
      return
    }
    if (input === "G") {
      dispatch({
        type: "jump-bottom",
        max: listHeight,
        total: visibleEntries.length,
      })
      return
    }
    if (input === "h" || key.leftArrow) {
      if (selected?.kind === "group" && selected.expanded) {
        dispatch({ type: "toggle-expand", path: selected.path })
      }
      return
    }
    if (input === "l" || key.rightArrow) {
      if (selected?.kind === "group" && !selected.expanded) {
        dispatch({ type: "toggle-expand", path: selected.path })
      }
      return
    }
    if (key.return) {
      if (selected?.kind === "group") {
        dispatch({ type: "toggle-expand", path: selected.path })
      } else {
        copySelected()
      }
      return
    }
    if (input === "p") {
      // Toggle full-body preview. Only meaningful for entries; on a
      // group row it's a no-op.
      if (selected?.kind === "entry") {
        dispatch({ type: "preview-toggle" })
      }
      return
    }
  })

  // Loading state
  if (state.loading) {
    return (
      <Box flexDirection="column" paddingX={1} paddingY={1}>
        <Text color={theme.overlay}>Loading store…</Text>
      </Box>
    )
  }

  // Empty store state
  if (state.entries.length === 0 && !state.loadError) {
    return (
      <Box flexDirection="column" paddingX={1} paddingY={1}>
        <Text color={theme.overlay}>
          No entries in <Text color={theme.lavender}>{state.storeRoot || storeRoot}</Text>.
        </Text>
        <Text color={theme.overlay} dimColor>
          Set $PASSWORD_STORE_DIR or run `pass init &lt;gpg-id&gt;`.
        </Text>
        <Box marginTop={1}>
          <Text color={theme.overlay}>Press q to quit.</Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Header
        storePath={state.storeRoot || storeRoot}
        visible={visibleEntries.filter((e) => e.kind === "entry").length}
        total={state.entries.filter((e) => e.kind === "entry").length}
        filtered={state.filterQuery.length > 0}
        error={state.loadError}
      />

      {state.mode === "filter" && <FilterInput value={state.filterQuery} />}
      {state.mode === "insert" && <InsertInput value={insertQuery} />}

      <Box flexDirection="row" flexGrow={1} marginTop={0}>
        <Box width={Math.floor(width * 0.4)} flexDirection="column">
          <EntryList
            entries={visibleEntries}
            selectedIndex={state.selectedIndex}
            scrollOffset={state.scrollOffset}
            maxVisible={listHeight}
            width={Math.floor(width * 0.4)}
          />
        </Box>
        <Box flexDirection="column" flexGrow={1} marginLeft={1}>
          <Preview
            entryPath={selected?.kind === "entry" ? selected.path : null}
            parsed={state.previewPath === selected?.path ? state.previewParsed : null}
            expanded={state.previewExpanded}
            loading={state.previewLoading}
            error={state.previewError}
          />
        </Box>
      </Box>

      {state.mode === "help" ? (
        <Box paddingX={1}>
          <HelpModal onClose={() => dispatch({ type: "enter-mode", mode: "normal" })} />
        </Box>
      ) : (
        <>
          <Toast toast={state.toast} width={width} />
          <HelpBar mode={state.mode} filterQuery={state.filterQuery} width={width} />
        </>
      )}
    </Box>
  )
}
