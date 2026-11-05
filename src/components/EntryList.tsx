import React from "react"
import { Box, Text } from "ink"
import type { Row } from "../utils/filter.js"
import { theme } from "../utils/theme.js"

interface Props {
  rows: Row[]
  collapsed: ReadonlySet<string>
  /** Flat ranked results (searching) instead of the tree. */
  flat: boolean
  selectedIndex: number
  scrollOffset: number
  height: number
  width: number
}

type Segment = { text: string; color: string; bold?: boolean }

/**
 * The scrollable list. Tree mode shows names indented under their
 * groups; flat mode (while searching) shows full paths with matched
 * characters highlighted, fzf-style.
 */
export function EntryList({
  rows,
  collapsed,
  flat,
  selectedIndex,
  scrollOffset,
  height,
  width,
}: Props) {
  if (rows.length === 0) {
    return (
      <Box paddingX={2}>
        <Text color={theme.overlay}>{flat ? "no matches" : "(empty)"}</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" width={width} height={height} overflow="hidden">
      {rows.slice(scrollOffset, scrollOffset + height).map((row, i) => {
        const segments = flat ? pathSegments(row) : treeSegments(row, collapsed)
        return (
          <Line
            key={row.entry.absPath}
            segments={segments}
            selected={scrollOffset + i === selectedIndex}
            width={width}
          />
        )
      })}
    </Box>
  )
}

function treeSegments({ entry }: Row, collapsed: ReadonlySet<string>): Segment[] {
  const indent = "  ".repeat(entry.depth)
  if (entry.kind === "group") {
    const chevron = collapsed.has(entry.path) ? "▸ " : "▾ "
    return [{ text: `${indent}${chevron}${entry.name}/`, color: theme.peach, bold: true }]
  }
  return [{ text: `${indent}  ${entry.name}`, color: theme.text }]
}

/** Full path: parent dim, name bright, matched characters yellow. */
function pathSegments({ entry, matches = [] }: Row): Segment[] {
  const nameStart = entry.path.length - entry.name.length
  const segments: Segment[] = []
  for (let i = 0; i < entry.path.length; i++) {
    const hit = matches.some(([a, b]) => i >= a && i <= b)
    const color = hit ? theme.yellow : i < nameStart ? theme.overlay : theme.text
    const last = segments[segments.length - 1]
    if (last && last.color === color) last.text += entry.path[i]
    else segments.push({ text: entry.path[i], color, bold: hit })
  }
  return segments
}

/** One row: selection marker, segments truncated to fit, background on select. */
function Line({
  segments,
  selected,
  width,
}: {
  segments: Segment[]
  selected: boolean
  width: number
}) {
  const bg = selected ? theme.surface0 : undefined
  let room = width - 2 // marker + trailing gutter
  const fitted: Segment[] = []
  for (const s of segments) {
    if (room <= 0) break
    const text = s.text.length > room ? s.text.slice(0, room - 1) + "…" : s.text
    fitted.push({ ...s, text })
    room -= text.length
  }
  return (
    <Text wrap="truncate">
      <Text color={theme.lavender} backgroundColor={bg}>
        {selected ? "▌" : " "}
      </Text>
      {fitted.map((s, i) => (
        <Text key={i} color={s.color} bold={s.bold} backgroundColor={bg}>
          {s.text}
        </Text>
      ))}
      <Text backgroundColor={bg}>{" ".repeat(Math.max(0, room + 1))}</Text>
    </Text>
  )
}
