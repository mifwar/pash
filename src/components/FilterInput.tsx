import React from "react"
import { Box, Text } from "ink"
import { theme } from "../utils/theme.js"

interface Props {
  value: string
}

/**
 * The fuzzy-filter text input row. Appears between the header and the
 * list when in filter mode. v0.1 uses a hand-rolled <Text> + cursor
 * instead of ink-text-input (deferred to v0.2).
 */
export function FilterInput({ value }: Props) {
  return (
    <Box paddingX={1}>
      <Text color={theme.overlay}>/ </Text>
      <Text color={theme.yellow}>{value}</Text>
      <Text color={theme.yellow}>▌</Text>
    </Box>
  )
}
