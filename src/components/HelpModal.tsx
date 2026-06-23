import React from "react"
import { Box, Text, useInput } from "ink"
import { theme } from "../utils/theme.js"

interface Props {
  onClose: () => void
}

const BINDINGS: Array<{ key: string; action: string }> = [
  { key: "j / ↓", action: "Move down" },
  { key: "k / ↑", action: "Move up" },
  { key: "g", action: "Jump to top" },
  { key: "G", action: "Jump to bottom" },
  { key: "h / ←", action: "Collapse group / parent" },
  { key: "l / →", action: "Expand group" },
  { key: "Enter", action: "Transient-copy password" },
  { key: "p", action: "Toggle full-body preview (plaintext on screen)" },
  { key: "/", action: "Filter (fuzzy)" },
  { key: "i", action: "Insert new entry (pass generate)" },
  { key: "Esc", action: "Clear filter / collapse preview / cancel insert" },
  { key: "R", action: "Reload store from disk" },
  { key: "?", action: "Toggle this help" },
  { key: "q / Ctrl-c", action: "Quit" },
]

/**
 * Full keybinding reference modal. Shows all implemented keys
 * (insert yes; generate-via-prompt / delete / OTP still pending).
 */
export function HelpModal({ onClose }: Props) {
  useInput((input, key) => {
    if (key.escape || input === "?" || input === "q") {
      onClose()
    }
  })

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.lavender}
      paddingX={2}
      paddingY={1}
    >
      <Text color={theme.lavender} bold>
        pash — keyboard shortcuts
      </Text>

      <Box marginTop={1} flexDirection="column">
        {BINDINGS.map(({ key, action }) => (
          <Box key={key}>
            <Box width={18}>
              <Text color={theme.yellow}>{key}</Text>
            </Box>
            <Text color={theme.subtext}>{action}</Text>
          </Box>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text color={theme.overlay} dimColor>
          Preview is off by default. The right pane shows entry path + non-secret frontmatter (login
          / url / email) so you can tell entries apart. Hit p to reveal the password on screen — the
          border turns red as a warning.
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text color={theme.overlay} dimColor>
          Transient copy uses your `passc` + `tc` pipeline — secrets never enter clipboard history.
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text color={theme.overlay} dimColor>
          Press ? or Esc to close
        </Text>
      </Box>
    </Box>
  )
}
