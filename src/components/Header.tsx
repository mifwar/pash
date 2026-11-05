import React from "react"
import { homedir } from "os"
import { Box, Text } from "ink"
import { theme } from "../utils/theme.js"

interface Props {
  storePath: string
  /** Right-hand status, e.g. "3/7" or "2 matches". */
  status: string
  error: string | null
}

/** Top line: app name + store path on the left, status or error on the right. */
export function Header({ storePath, status, error }: Props) {
  const home = homedir()
  const shown = storePath.startsWith(home) ? "~" + storePath.slice(home.length) : storePath
  return (
    <Box paddingX={1} justifyContent="space-between">
      <Text wrap="truncate">
        <Text color={theme.lavender} bold>
          pash
        </Text>
        <Text color={theme.overlay}> {shown}</Text>
      </Text>
      {error ? <Text color={theme.red}>{error}</Text> : <Text color={theme.overlay}>{status}</Text>}
    </Box>
  )
}
