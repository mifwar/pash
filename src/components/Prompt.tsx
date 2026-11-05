import React from "react"
import { Text } from "ink"
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
    <Text wrap="truncate">
      <Text color={color} bold>
        {label}{" "}
      </Text>
      <Text color={theme.yellow}>{value}</Text>
      {active && <Text color={theme.yellow}>▌</Text>}
    </Text>
  )
}
