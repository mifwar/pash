import React from "react"
import { Box, Text } from "ink"
import { KEYMAP } from "../keymap.js"
import { theme } from "../utils/theme.js"

/** Full keybinding reference, rendered from KEYMAP. App handles closing it. */
export function HelpModal() {
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
        {KEYMAP.map(({ label, description }) => (
          <Box key={label}>
            <Box width={14}>
              <Text color={theme.yellow}>{label}</Text>
            </Box>
            <Text color={theme.subtext}>{description}</Text>
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
