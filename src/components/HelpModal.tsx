import React from "react"
import { Box, Text } from "ink"
import { KEYMAP } from "../keymap.js"
import { theme } from "../utils/theme.js"

const NOTES = [
  "Passwords stay masked until you press p; the divider turns red while one is visible.",
  "Copy goes through passc + tc, so secrets never enter clipboard history.",
]

/**
 * Full keybinding reference, shown in place of the body. Splits into
 * two columns, then drops the notes, when the terminal is too short:
 * Ink can't cleanly clip overflowing content.
 */
export function HelpModal({ height }: { height: number }) {
  const notesFit = height >= Math.ceil(KEYMAP.length / 2) + 1 + NOTES.length + 1
  const rowsAvailable = height - 1 - (notesFit ? NOTES.length + 1 : 0)
  const perColumn = KEYMAP.length <= rowsAvailable ? KEYMAP.length : Math.ceil(KEYMAP.length / 2)
  const columns = [KEYMAP.slice(0, perColumn), KEYMAP.slice(perColumn)].filter((c) => c.length)

  return (
    <Box flexDirection="column" height={height} paddingX={2}>
      <Text color={theme.lavender} bold>
        Keys
      </Text>
      <Box>
        {columns.map((column, i) => (
          <Box key={i} flexDirection="column" flexBasis={0} flexGrow={1} paddingRight={2}>
            {column.slice(0, rowsAvailable).map(({ label, description }) => (
              <Text key={label} wrap="truncate">
                <Text color={theme.yellow}>{label.padEnd(13)}</Text>
                <Text color={theme.subtext}>{description}</Text>
              </Text>
            ))}
          </Box>
        ))}
      </Box>
      {notesFit && (
        <Box marginTop={1} flexDirection="column">
          {NOTES.map((note) => (
            <Text key={note} color={theme.overlay} wrap="truncate">
              {note}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  )
}
