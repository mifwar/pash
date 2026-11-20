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
import { passGenerate, passInsert, passShow, setPassword } from "./utils/pass.js"
import { resolvePassc, transientCopy } from "./utils/clipboard.js"
import { buildFuse, search, type Row } from "./utils/filter.js"
import { theme } from "./utils/theme.js"
import type { Toast as ToastT, ViewMode } from "./types/entry.js"

interface Props {
  onExit: () => void
  storeRoot: string
}

const TOAST_TTL_MS = 3000

interface PromptSpec {
  label: string
  color: string
  /** What the prompt displays (masked for passwords). */
  value: string
  submit: () => void
}

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err))

export function App({ onExit, storeRoot }: Props) {
  const { stdout } = useStdout()
  const width = stdout?.columns ?? 100
  const height = stdout?.rows ?? 24

  const [state, dispatch] = useReducer(reducer, initialState)
  const [previewEpoch, bumpPreview] = useReducer((n: number) => n + 1, 0)

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
    bumpPreview()
  }, [storeRoot])

  useEffect(() => {
    reload()
  }, [reload])

  // Searching: flat ranked results. Otherwise: the tree minus collapsed subtrees.
  const searching = state.filterQuery !== ""
  const fuse = useMemo(() => buildFuse(state.entries), [state.entries])
  const rows = useMemo<Row[]>(
    () =>
      searching
        ? search(fuse, state.filterQuery)
        : state.entries
            .filter((e) => !isHidden(state.collapsed, e.parent))
            .map((entry) => ({ entry })),
    [searching, fuse, state.entries, state.filterQuery, state.collapsed]
  )
  const selected = rows[state.selectedIndex]?.entry ?? null
  const selectedEntryPath = selected?.kind === "entry" ? selected.path : null
  const preview = usePreview(selectedEntryPath, previewEpoch)
  const revealed = selectedEntryPath !== null && state.revealedPath === selectedEntryPath

  // Fixed layout: header (1) + body + footer (2). Nothing shifts as toasts come and go.
  const listHeight = Math.max(1, height - 3)
  const listWidth = Math.min(40, Math.max(24, Math.floor(width * 0.35)))
  const total = rows.length

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

  // Selection can't move in edit mode, so the selected entry is the target.
  const editEntry = async () => {
    if (!selectedEntryPath) return
    if (!state.draft) {
      showToast({ text: "Password must be non-empty", kind: "error" })
      return
    }
    try {
      // Fresh decrypt, not the preview cache: never write back a stale body.
      const body = await passShow(selectedEntryPath)
      await passInsert(selectedEntryPath, setPassword(body, state.draft))
      dispatch({ type: "mode", mode: "normal" })
      bumpPreview()
      showToast({ text: `Updated ${selectedEntryPath}`, kind: "success" })
    } catch (err) {
      showToast({ text: `Edit failed: ${errorMessage(err)}`, kind: "error" })
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
      const parent = rows.findIndex((r) => r.entry.path === selected?.parent)
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
    edit: () => {
      if (selectedEntryPath) dispatch({ type: "mode", mode: "edit" })
    },
    back: () => {
      if (revealed) dispatch({ type: "reveal", path: null })
      else if (state.filterQuery) dispatch({ type: "filter", query: "" })
    },
    reload: () => reload().then(() => showToast({ text: "Reloaded store", kind: "success" })),
    help: () => dispatch({ type: "mode", mode: "help" }),
    quit: onExit,
  }

  /** Modes that take a one-line text prompt, and what Enter does in each. */
  const prompts: Record<ViewMode, PromptSpec | null> = {
    normal: null,
    help: null,
    filter: {
      label: "/",
      color: theme.lavender,
      value: state.filterQuery,
      submit: () => dispatch({ type: "mode", mode: "normal" }),
    },
    insert: { label: "+", color: theme.green, value: state.draft, submit: insertEntry },
    edit: {
      label: `${selectedEntryPath} new password:`,
      color: theme.peach,
      value: "•".repeat(state.draft.length),
      submit: editEntry,
    },
  }
  const activePrompt = prompts[state.mode]

  const onPromptKey = (prompt: PromptSpec, input: string, key: Key) => {
    const filtering = state.mode === "filter"
    const name = keyName(input, key)
    if (name === "esc") {
      if (filtering) dispatch({ type: "filter", query: "" })
      dispatch({ type: "mode", mode: "normal" })
    } else if (name === "enter") {
      prompt.submit()
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
    if (activePrompt) return onPromptKey(activePrompt, input, key)
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

  const entryCount = state.entries.filter((e) => e.kind === "entry").length
  const groupSize =
    selected?.kind === "group"
      ? state.entries.filter((e) => e.kind === "entry" && e.path.startsWith(selected.path + "/"))
          .length
      : 0
  const promptLine = activePrompt ?? (searching && prompts.filter)
  const prompt = promptLine && (
    <Prompt
      label={promptLine.label}
      color={promptLine.color}
      value={promptLine.value}
      active={promptLine === activePrompt}
    />
  )

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Header
        storePath={storeRoot}
        status={searching ? `${total} of ${entryCount} entries` : `${entryCount} entries`}
        error={state.loadError}
      />

      {state.mode === "help" ? (
        <HelpModal height={listHeight} />
      ) : (
        <Box height={listHeight}>
          <EntryList
            rows={rows}
            collapsed={state.collapsed}
            flat={searching}
            selectedIndex={state.selectedIndex}
            scrollOffset={state.scrollOffset}
            height={listHeight}
            width={listWidth}
          />
          <Preview
            entry={selected}
            groupSize={groupSize}
            preview={preview}
            revealed={revealed}
            height={listHeight}
          />
        </Box>
      )}

      <Box paddingX={1} justifyContent="space-between" height={1}>
        <Box flexShrink={0}>{prompt || <Text> </Text>}</Box>
        <Box marginLeft={2} flexShrink={1}>
          <Toast toast={state.toast} />
        </Box>
      </Box>
      <HelpBar mode={state.mode} />
    </Box>
  )
}
