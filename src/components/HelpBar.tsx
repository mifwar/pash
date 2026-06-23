import React from "react"
import { Box, Text } from "ink"
import { theme } from "../utils/theme.js"
import type { ViewMode } from "../types/entry.js"

interface Props {
  mode: ViewMode
  filterQuery: string
  width: number
}

/**
 * Bottom keybinding strip. Different content per mode so the user
 * always sees what's actionable.
 */
export function HelpBar({ mode, filterQuery, width }: Props) {
  let content: React.ReactNode
  if (mode === "filter") {
    content = (
      <Text>
        <Text color={theme.overlay}>filter: </Text>
        <Text color={theme.yellow}>{filterQuery || "_"}</Text>
        <Text color={theme.overlay}> · Enter apply · Esc clear</Text>
      </Text>
    )
  } else if (mode === "insert") {
    content = (
      <Text>
        <Text color={theme.green}>new path: </Text>
        <Text color={theme.yellow}>{filterQuery || "_"}</Text>
        <Text color={theme.overlay}> · Enter generate · Esc cancel</Text>
      </Text>
    )
  } else if (mode === "help") {
    content = <Text color={theme.overlay}>? / Esc close help</Text>
  } else {
    content = (
      <Text color={theme.overlay}>
        <Text color={theme.lavender}>j/k</Text> move · <Text color={theme.lavender}>Enter</Text>{" "}
        copy · <Text color={theme.lavender}>p</Text> preview · <Text color={theme.lavender}>/</Text>{" "}
        filter · <Text color={theme.lavender}>i</Text> insert ·{" "}
        <Text color={theme.lavender}>R</Text> reload · <Text color={theme.lavender}>?</Text> help ·{" "}
        <Text color={theme.lavender}>q</Text> quit
      </Text>
    )
  }

  return (
    <Box paddingX={1} width={width}>
      {content}
    </Box>
  )
}
