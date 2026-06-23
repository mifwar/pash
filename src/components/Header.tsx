import React from "react"
import { Box, Text } from "ink"
import { theme } from "../utils/theme.js"

interface Props {
  storePath: string
  visible: number
  total: number
  filtered: boolean
  error: string | null
}

/**
 * Top status line: app name, store path, entry counts, error state.
 *
 * Always 1 line tall. Errors replace the count line in red.
 */
export function Header({ storePath, visible, total, filtered, error }: Props) {
  if (error) {
    return (
      <Box paddingX={1} flexDirection="row" justifyContent="space-between">
        <Text>
          <Text color={theme.lavender} bold>
            pash
          </Text>
          <Text color={theme.overlay}> — {storePath}</Text>
        </Text>
        <Text color={theme.red}>{error}</Text>
      </Box>
    )
  }

  return (
    <Box paddingX={1} flexDirection="row" justifyContent="space-between">
      <Text>
        <Text color={theme.lavender} bold>
          pash
        </Text>
        <Text color={theme.overlay}> — {storePath}</Text>
      </Text>
      <Text color={theme.subtext}>
        {visible}
        {filtered ? ` of ${total}` : ""} {visible === 1 ? "entry" : "entries"}
      </Text>
    </Box>
  )
}
