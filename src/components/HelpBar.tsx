import React from "react"
import { Box, Text } from "ink"
import { theme } from "../utils/theme.js"
import type { ViewMode } from "../types/entry.js"

/** Curated per-mode hints; the full reference is the help modal. */
const HINTS: Record<ViewMode, Array<[string, string]>> = {
  normal: [
    ["j/k", "move"],
    ["Enter", "copy"],
    ["p", "preview"],
    ["/", "filter"],
    ["i", "insert"],
    ["R", "reload"],
    ["?", "help"],
    ["q", "quit"],
  ],
  filter: [
    ["↑/↓", "move"],
    ["Enter", "apply"],
    ["Esc", "clear"],
  ],
  insert: [
    ["Enter", "generate"],
    ["Esc", "cancel"],
  ],
  help: [["? / Esc", "close help"]],
}

/** Bottom keybinding strip for the current mode. */
export function HelpBar({ mode, width }: { mode: ViewMode; width: number }) {
  return (
    <Box paddingX={1} width={width}>
      <Text color={theme.overlay}>
        {HINTS[mode].map(([key, action], i) => (
          <Text key={key}>
            {i > 0 && " · "}
            <Text color={theme.lavender}>{key}</Text> {action}
          </Text>
        ))}
      </Text>
    </Box>
  )
}
