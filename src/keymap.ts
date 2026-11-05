import type { Key } from "ink"

/**
 * Single source of truth for normal-mode key bindings. The help modal
 * and `pash --help` both render from this table; App maps each
 * command to a handler.
 */
export type Command =
  | "down"
  | "up"
  | "pageDown"
  | "pageUp"
  | "top"
  | "bottom"
  | "collapse"
  | "expand"
  | "activate"
  | "reveal"
  | "filter"
  | "insert"
  | "back"
  | "reload"
  | "help"
  | "quit"

interface Binding {
  command: Command
  /** Names produced by `keyName`. */
  keys: string[]
  label: string
  description: string
}

export const KEYMAP: Binding[] = [
  { command: "down", keys: ["j", "down"], label: "j / ↓", description: "Move down" },
  { command: "up", keys: ["k", "up"], label: "k / ↑", description: "Move up" },
  {
    command: "pageDown",
    keys: ["ctrl-d", "pagedown"],
    label: "Ctrl-d",
    description: "Half page down",
  },
  { command: "pageUp", keys: ["ctrl-u", "pageup"], label: "Ctrl-u", description: "Half page up" },
  { command: "top", keys: ["g"], label: "g", description: "Jump to top" },
  { command: "bottom", keys: ["G"], label: "G", description: "Jump to bottom" },
  {
    command: "collapse",
    keys: ["h", "left"],
    label: "h / ←",
    description: "Collapse group / jump to parent",
  },
  { command: "expand", keys: ["l", "right"], label: "l / →", description: "Expand group" },
  {
    command: "activate",
    keys: ["enter"],
    label: "Enter",
    description: "Transient-copy password / toggle group",
  },
  { command: "reveal", keys: ["p"], label: "p", description: "Toggle plaintext preview" },
  {
    command: "filter",
    keys: ["/"],
    label: "/",
    description: "Filter (fuzzy; ↑/↓ or Ctrl-n/p to move)",
  },
  { command: "insert", keys: ["i"], label: "i", description: "Insert new entry (pass generate)" },
  { command: "back", keys: ["esc"], label: "Esc", description: "Hide preview / clear filter" },
  { command: "reload", keys: ["R"], label: "R", description: "Reload store from disk" },
  { command: "help", keys: ["?"], label: "?", description: "Toggle help" },
  { command: "quit", keys: ["q", "ctrl-c"], label: "q / Ctrl-c", description: "Quit" },
]

/** Normalize an Ink key event to the names used in `KEYMAP`. */
export function keyName(input: string, key: Key): string {
  if (key.upArrow) return "up"
  if (key.downArrow) return "down"
  if (key.leftArrow) return "left"
  if (key.rightArrow) return "right"
  if (key.pageUp) return "pageup"
  if (key.pageDown) return "pagedown"
  if (key.return) return "enter"
  if (key.escape) return "esc"
  return key.ctrl ? `ctrl-${input}` : input
}

const byKey = new Map(KEYMAP.flatMap((b) => b.keys.map((k) => [k, b.command] as const)))

export function commandFor(input: string, key: Key): Command | undefined {
  return byKey.get(keyName(input, key))
}

/**
 * Apply a keystroke to a single-line text field. Returns the new value,
 * or null if the key isn't a text edit. Accepts multi-char input so
 * pastes work.
 */
export function editLine(value: string, input: string, key: Key): string | null {
  if (key.backspace || key.delete) return value.slice(0, -1)
  if (input && !key.ctrl && !key.meta && !/[\x00-\x1f]/.test(input)) return value + input
  return null
}
