import React from "react"
import { Box, Text } from "ink"
import { theme } from "../utils/theme.js"

interface Props {
  label: string
  color: string
  value: string
  /** False when shown read-only, e.g. an applied filter. */
  active: boolean
}

/** One-line text prompt (filter / insert). Hand-rolled; see DECISIONS.md. */
export function Prompt({ label, color, value, active }: Props) {
  return (
    <Box paddingX={1}>
      <Text color={color}>{label} </Text>
      <Text color={theme.yellow}>{value}</Text>
      {active ? (
        <Text color={theme.yellow}>▌</Text>
      ) : (
        <Text color={theme.overlay}> · Esc clear</Text>
      )}
    </Box>
  )
}
