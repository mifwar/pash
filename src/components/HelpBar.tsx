import React from "react"
import { Box, Text } from "ink"
import { theme } from "../utils/theme.js"
import type { ViewMode } from "../types/entry.js"

/** Curated per-mode hints; the full reference is the help modal. */
const HINTS: Record<ViewMode, Array<[string, string]>> = {
  normal: [
    ["j/k", "move"],
    ["⏎", "copy"],
    ["p", "reveal"],
    ["/", "filter"],
    ["i", "insert"],
    ["e", "edit"],
    ["y", "copy path"],
    ["R", "reload"],
    ["?", "help"],
    ["q", "quit"],
  ],
  filter: [
    ["↑/↓", "move"],
    ["⏎", "apply"],
    ["Esc", "clear"],
  ],
  insert: [
    ["Tab", "mode"],
    ["j/k", "rule"],
    ["Space / ←→", "change"],
    ["⏎", "next / create"],
    ["Esc", "back / cancel"],
  ],
  edit: [
    ["⏎", "save"],
    ["Esc", "cancel"],
  ],
  help: [["? / Esc", "close help"]],
}

/** Bottom keybinding strip for the current mode. */
export const HelpBar = React.memo(function HelpBar({ mode }: { mode: ViewMode }) {
  return (
    <Box paddingX={1}>
      <Text color={theme.overlay} wrap="truncate">
        {HINTS[mode].map(([key, action], i) => (
          <Text key={key}>
            {i > 0 && " · "}
            <Text color={theme.lavender}>{key}</Text> {action}
          </Text>
        ))}
      </Text>
    </Box>
  )
})
