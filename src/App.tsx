import React, { useCallback, useEffect, useMemo, useReducer, useRef } from "react"
import { Box, Text, useInput, useStdout, type Key } from "ink"
import { Header } from "./components/Header.js"
import { EntryList } from "./components/EntryList.js"
import { Preview } from "./components/Preview.js"
import { HelpBar } from "./components/HelpBar.js"
import { HelpModal } from "./components/HelpModal.js"
import { Toast } from "./components/Toast.js"
import { Prompt } from "./components/Prompt.js"
import { usePreview } from "./hooks/usePreview.js"
import { commandFor, editLine, keyName, type Command } from "./keymap.js"
import { initialState, isHidden, reducer } from "./state.js"
import { loadStore } from "./utils/store.js"
import { passGenerate } from "./utils/pass.js"
import { resolvePassc, transientCopy } from "./utils/clipboard.js"
import { buildFuse, applyFilter } from "./utils/filter.js"
import { theme } from "./utils/theme.js"
import type { Toast as ToastT } from "./types/entry.js"

interface Props {
  onExit: () => void
  storeRoot: string
}

const TOAST_TTL_MS = 3000

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err))

export function App({ onExit, storeRoot }: Props) {
  const { stdout } = useStdout()
  const width = stdout?.columns ?? 100
  const height = stdout?.rows ?? 24

  const [state, dispatch] = useReducer(reducer, initialState)

  // passc resolved once; the promise is awaited at copy time.
  const passc = useMemo(() => resolvePassc(), [])

  const toastTimer = useRef<ReturnType<typeof setTimeout>>()
  const showToast = useCallback((toast: ToastT) => {
    clearTimeout(toastTimer.current)
    dispatch({ type: "toast", toast })
    toastTimer.current = setTimeout(() => dispatch({ type: "toast", toast: null }), TOAST_TTL_MS)
  }, [])

  const reload = useCallback(async () => {
    const res = await loadStore(storeRoot)
    dispatch({ type: "loaded", entries: res.entries, error: res.error })
  }, [storeRoot])

  useEffect(() => {
    reload()
  }, [reload])

  // Visible list = fuzzy filter, then hide rows under collapsed groups.
  const fuse = useMemo(() => buildFuse(state.entries), [state.entries])
  const visibleEntries = useMemo(
    () =>
      applyFilter(fuse, state.entries, state.filterQuery).filter(
        (e) => !isHidden(state.collapsed, e.parent)
      ),
    [fuse, state.entries, state.filterQuery, state.collapsed]
  )
  const selected = visibleEntries[state.selectedIndex] ?? null
  const selectedEntryPath = selected?.kind === "entry" ? selected.path : null
  const preview = usePreview(selectedEntryPath)
  const revealed = selectedEntryPath !== null && state.revealedPath === selectedEntryPath

  // Layout: header + [prompt] + list + [toast] + help bar
  const showFilter = state.mode === "filter" || state.filterQuery !== ""
  const promptRows = showFilter || state.mode === "insert" ? 1 : 0
  const listHeight = Math.max(1, height - 2 - promptRows - (state.toast ? 1 : 0))
  const total = visibleEntries.length

  const select = (index: number) => dispatch({ type: "select", index, rows: listHeight, total })

  // Re-clamp selection when the list or viewport changes shape.
  useEffect(() => {
    dispatch({ type: "select", index: state.selectedIndex, rows: listHeight, total })
  }, [total, listHeight]) // eslint-disable-line react-hooks/exhaustive-deps

  const copySelected = async () => {
    if (!selectedEntryPath) return
    const bin = await passc
    if (!bin) {
      showToast({ text: "passc not found — install it or set $PASH_PASSC", kind: "error" })
      return
    }
    const result = await transientCopy(bin, selectedEntryPath)
    showToast(
      result.ok
        ? {
            text: `Copied ${selectedEntryPath} (auto-clear in ${result.clearIn ?? 45}s)`,
            kind: "success",
          }
        : { text: `Copy failed: ${result.error ?? "unknown"}`, kind: "error" }
    )
  }

  const insertEntry = async () => {
    const path = state.draft.trim()
    if (!path || /\s/.test(path)) {
      showToast({ text: "Path must be non-empty with no whitespace", kind: "error" })
      return
    }
    try {
      await passGenerate(path)
      dispatch({ type: "mode", mode: "normal" })
      await reload()
      showToast({ text: `Created ${path}`, kind: "success" })
    } catch (err) {
      showToast({ text: `Insert failed: ${errorMessage(err)}`, kind: "error" })
    }
  }

  const halfPage = Math.max(1, Math.floor(listHeight / 2))
  const toggleGroup = (path: string) => dispatch({ type: "toggle-group", path })
  const isOpenGroup = selected?.kind === "group" && !state.collapsed.has(selected.path)

  const commands: Record<Command, () => void> = {
    down: () => select(state.selectedIndex + 1),
    up: () => select(state.selectedIndex - 1),
    pageDown: () => select(state.selectedIndex + halfPage),
    pageUp: () => select(state.selectedIndex - halfPage),
    top: () => select(0),
    bottom: () => select(total - 1),
    collapse: () => {
      if (isOpenGroup) return toggleGroup(selected.path)
      const parent = visibleEntries.findIndex((e) => e.path === selected?.parent)
      if (parent >= 0) select(parent)
    },
    expand: () => {
      if (selected?.kind === "group" && !isOpenGroup) toggleGroup(selected.path)
    },
    activate: () => {
      if (selected?.kind === "group") toggleGroup(selected.path)
      else copySelected()
    },
    reveal: () => {
      if (selectedEntryPath) dispatch({ type: "reveal", path: revealed ? null : selectedEntryPath })
    },
    filter: () => dispatch({ type: "mode", mode: "filter" }),
    insert: () => dispatch({ type: "mode", mode: "insert" }),
    back: () => {
      if (revealed) dispatch({ type: "reveal", path: null })
      else if (state.filterQuery) dispatch({ type: "filter", query: "" })
    },
    reload: () => reload().then(() => showToast({ text: "Reloaded store", kind: "success" })),
    help: () => dispatch({ type: "mode", mode: "help" }),
    quit: onExit,
  }

  /** Filter and insert are the same shape: a one-line prompt. */
  const onPromptKey = (input: string, key: Key) => {
    const filtering = state.mode === "filter"
    const name = keyName(input, key)
    if (name === "esc") {
      if (filtering) dispatch({ type: "filter", query: "" })
      dispatch({ type: "mode", mode: "normal" })
    } else if (name === "enter") {
      if (filtering) dispatch({ type: "mode", mode: "normal" })
      else insertEntry()
    } else if (filtering && (name === "down" || name === "ctrl-n")) {
      commands.down()
    } else if (filtering && (name === "up" || name === "ctrl-p")) {
      commands.up()
    } else {
      const value = editLine(filtering ? state.filterQuery : state.draft, input, key)
      if (value === null) return
      dispatch(filtering ? { type: "filter", query: value } : { type: "draft", value })
    }
  }

  useInput((input, key) => {
    if (state.mode === "filter" || state.mode === "insert") return onPromptKey(input, key)
    const command = commandFor(input, key)
    if (state.mode === "help") {
      if (command === "help" || command === "back" || command === "quit") {
        dispatch({ type: "mode", mode: "normal" })
      }
      return
    }
    if (command) commands[command]()
  })

  if (state.loading) {
    return (
      <Box paddingX={1} paddingY={1}>
        <Text color={theme.overlay}>Loading store…</Text>
      </Box>
    )
  }

  if (state.entries.length === 0 && !state.loadError) {
    return (
      <Box flexDirection="column" paddingX={1} paddingY={1}>
        <Text color={theme.overlay}>
          No entries in <Text color={theme.lavender}>{storeRoot}</Text>.
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

  const countEntries = (list: typeof visibleEntries) =>
    list.filter((e) => e.kind === "entry").length

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Header
        storePath={storeRoot}
        visible={countEntries(visibleEntries)}
        total={countEntries(state.entries)}
        filtered={state.filterQuery !== ""}
        error={state.loadError}
      />

      {state.mode === "insert" ? (
        <Prompt label="+ new:" color={theme.green} value={state.draft} active />
      ) : (
        showFilter && (
          <Prompt
            label="/"
            color={theme.overlay}
            value={state.filterQuery}
            active={state.mode === "filter"}
          />
        )
      )}

      <Box flexDirection="row" flexGrow={1}>
        <Box width={Math.floor(width * 0.4)} flexDirection="column">
          <EntryList
            entries={visibleEntries}
            collapsed={state.collapsed}
            selectedIndex={state.selectedIndex}
            scrollOffset={state.scrollOffset}
            maxVisible={listHeight}
            width={Math.floor(width * 0.4)}
          />
        </Box>
        <Box flexDirection="column" flexGrow={1} marginLeft={1}>
          <Preview path={selectedEntryPath} preview={preview} revealed={revealed} />
        </Box>
      </Box>

      {state.mode === "help" ? (
        <Box paddingX={1}>
          <HelpModal />
        </Box>
      ) : (
        <>
          <Toast toast={state.toast} width={width} />
          <HelpBar mode={state.mode} width={width} />
        </>
      )}
    </Box>
  )
}
