import React from "react"
import { Box, Text } from "ink"
import type { Entry } from "../types/entry.js"
import type { ParsedEntry } from "../utils/pass.js"
import type { PreviewState } from "../hooks/usePreview.js"
import { theme } from "../utils/theme.js"

interface Props {
  entry: Entry | null
  /** Entries below `entry` when it's a group. */
  groupSize: number
  preview: PreviewState
  /** Render the full decrypted body. Off = metadata only. */
  revealed: boolean
  height: number
}

/** Keys shown first, in this order; any others follow alphabetically. */
const FRONTMATTER_ORDER = ["login", "user", "username", "email", "url", "otpauth", "notes"]

/**
 * Right pane. By default shows non-secret frontmatter with the
 * password masked, so entries can be told apart without plaintext on
 * screen. `p` reveals the full body; the divider turns red while it's
 * visible.
 */
export function Preview({ entry, groupSize, preview, revealed, height }: Props) {
  return (
    <Box
      flexDirection="column"
      height={height}
      overflow="hidden"
      borderStyle="single"
      borderTop={false}
      borderRight={false}
      borderBottom={false}
      borderColor={revealed ? theme.red : theme.surface1}
      paddingLeft={2}
      flexGrow={1}
    >
      {entry && <Title entry={entry} revealed={revealed} />}
      {entry?.kind === "group" && (
        <Text color={theme.subtext}>
          {groupSize} {groupSize === 1 ? "entry" : "entries"}
        </Text>
      )}
      {entry?.kind === "entry" && <Body preview={preview} revealed={revealed} />}
    </Box>
  )
}

function Title({ entry, revealed }: { entry: Entry; revealed: boolean }) {
  const parent = entry.parent ? `${entry.parent}/` : ""
  return (
    <Box marginBottom={1}>
      <Text>
        <Text color={theme.overlay}>{parent}</Text>
        <Text color={entry.kind === "group" ? theme.peach : theme.lavender} bold>
          {entry.name}
          {entry.kind === "group" ? "/" : ""}
        </Text>
        {revealed && <Text color={theme.red}> ● plaintext visible</Text>}
      </Text>
    </Box>
  )
}

function Body({ preview, revealed }: { preview: PreviewState; revealed: boolean }) {
  switch (preview.status) {
    case "idle":
    case "loading":
      return <Text color={theme.overlay}>decrypting…</Text>
    case "error":
      return <Text color={theme.red}>{preview.error}</Text>
    case "ready":
      return revealed ? <Plaintext parsed={preview.parsed} /> : <Fields parsed={preview.parsed} />
  }
}

/** Frontmatter rows plus the masked password. */
function Fields({ parsed }: { parsed: ParsedEntry }) {
  const keys = Object.keys(parsed.frontmatter)
  const rank = (k: string) => {
    const i = FRONTMATTER_ORDER.indexOf(k)
    return i < 0 ? FRONTMATTER_ORDER.length : i
  }
  keys.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))

  const rows: Array<[string, string, string]> = keys.map((k) => [
    k,
    parsed.frontmatter[k],
    theme.text,
  ])
  if (parsed.password) {
    rows.push(["password", `••••••••  ${parsed.password.length} chars`, theme.overlay])
  }
  if (rows.length === 0) return <Text color={theme.overlay}>(empty entry)</Text>

  const labelWidth = Math.max(...rows.map(([k]) => k.length)) + 2
  return (
    <Box flexDirection="column">
      {rows.map(([key, value, color]) => (
        <Text key={key} wrap="truncate">
          <Text color={theme.overlay}>{key.padEnd(labelWidth)}</Text>
          <Text color={color}>{value}</Text>
        </Text>
      ))}
    </Box>
  )
}

/** Full decrypted body; the password line is emphasized. */
function Plaintext({ parsed }: { parsed: ParsedEntry }) {
  return (
    <Box flexDirection="column">
      {parsed.body.split("\n").map((line, i) => (
        <Text
          key={i}
          wrap="truncate"
          color={
            line === parsed.password ? theme.red : line.startsWith("#") ? theme.subtext : theme.text
          }
          bold={line === parsed.password}
        >
          {line}
        </Text>
      ))}
    </Box>
  )
}
