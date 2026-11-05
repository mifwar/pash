import React from "react"
import { Box, Text } from "ink"
import type { Entry } from "../types/entry.js"
import { theme } from "../utils/theme.js"

interface Props {
  entries: Entry[]
  collapsed: ReadonlySet<string>
  selectedIndex: number
  scrollOffset: number
  maxVisible: number
  width: number
}

/**
 * The flat, scrollable list of entries + groups.
 *
 * Indented by depth (2 spaces per level). Groups render with `▸/▾`
 * expand toggles; entries with a 🔒 glyph. The selected row gets a
 * reverse-video background via ink's `inverse` prop.
 */
export function EntryList({
  entries,
  collapsed,
  selectedIndex,
  scrollOffset,
  maxVisible,
  width,
}: Props) {
  if (entries.length === 0) {
    return (
      <Box paddingX={2} paddingY={1}>
        <Text color={theme.overlay} dimColor>
          (no entries)
        </Text>
      </Box>
    )
  }

  const showScrollUp = scrollOffset > 0
  const showScrollDown = scrollOffset + maxVisible < entries.length
  const visibleSlice = entries.slice(scrollOffset, scrollOffset + maxVisible)

  return (
    <Box flexDirection="column" paddingX={1}>
      {showScrollUp && (
        <Text color={theme.overlay} dimColor>
          {"  "}▲ {scrollOffset} more
        </Text>
      )}
      {visibleSlice.map((entry, i) => {
        const absoluteIndex = scrollOffset + i
        const isSelected = absoluteIndex === selectedIndex
        return (
          <Row
            key={entry.absPath}
            entry={entry}
            expanded={!collapsed.has(entry.path)}
            isSelected={isSelected}
            width={width}
          />
        )
      })}
      {showScrollDown && (
        <Text color={theme.overlay} dimColor>
          {"  "}▼ {entries.length - scrollOffset - maxVisible} more
        </Text>
      )}
    </Box>
  )
}

function Row({
  entry,
  expanded,
  isSelected,
  width,
}: {
  entry: Entry
  expanded: boolean
  isSelected: boolean
  width: number
}) {
  const indent = "  ".repeat(entry.depth)

  if (entry.kind === "group") {
    const chevron = expanded ? "▾ " : "▸ "
    return (
      <Box>
        <Text inverse={isSelected} color={isSelected ? undefined : theme.peach}>
          {indent}
          {chevron}
          {entry.name}/
        </Text>
      </Box>
    )
  }

  const icon = "🔒 "
  const maxPath = Math.max(20, width - indent.length - icon.length - 4)
  const displayPath =
    entry.path.length > maxPath ? entry.path.slice(0, maxPath - 1) + "…" : entry.path

  return (
    <Box>
      <Text inverse={isSelected} color={isSelected ? undefined : theme.text}>
        {indent}
        {icon}
        {displayPath}
      </Text>
    </Box>
  )
}
