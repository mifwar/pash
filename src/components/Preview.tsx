import React from "react"
import { Box, Text } from "ink"
import type { ParsedEntry } from "../utils/pass.js"
import type { PreviewState } from "../hooks/usePreview.js"
import { theme } from "../utils/theme.js"

interface Props {
  path: string | null
  preview: PreviewState
  /** Render the full decrypted body. Off = metadata only. */
  revealed: boolean
}

/**
 * Right-pane preview. Two modes:
 *
 * - **Default:** entry path + non-secret frontmatter (login, url,
 *   email, …) with the password masked. Disambiguation without
 *   plaintext on screen.
 * - **Revealed (`p`):** the full decrypted body, with a "PREVIEW" chip
 *   and a red border so it's obvious the secret is visible.
 *
 * Body output is capped at MAX_LINES so a giant entry can't blow up
 * the layout.
 */
const MAX_LINES = 30

const FRONTMATTER_ORDER = ["login", "url", "email", "otpauth", "notes"] as const

export function Preview({ path, preview, revealed }: Props) {
  if (!path) {
    return (
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={theme.surface1}
        paddingX={1}
        flexGrow={1}
      >
        <Text color={theme.overlay} dimColor>
          (select an entry)
        </Text>
      </Box>
    )
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={revealed ? theme.red : theme.surface1}
      paddingX={1}
      flexGrow={1}
    >
      <Box marginBottom={1}>
        <Text color={theme.lavender} bold>
          {path}
        </Text>
        {revealed && (
          <Text color={theme.red} bold>
            {" "}
            · PREVIEW
          </Text>
        )}
      </Box>

      {preview.status === "loading" && (
        <Text color={theme.overlay} dimColor>
          Loading…
        </Text>
      )}
      {preview.status === "error" && <Text color={theme.red}>{preview.error}</Text>}
      {preview.status === "ready" && (
        <Box flexDirection="column">
          <Metadata parsed={preview.parsed} />
          {revealed ? <BodyView parsed={preview.parsed} /> : <Hint />}
        </Box>
      )}
    </Box>
  )
}

/** Non-secret frontmatter rows, in canonical order. */
function Metadata({ parsed }: { parsed: ParsedEntry }) {
  const seen = new Set<string>()
  const rows: Array<[string, string]> = []

  for (const key of FRONTMATTER_ORDER) {
    if (parsed.frontmatter[key] !== undefined) {
      rows.push([key, parsed.frontmatter[key]])
      seen.add(key)
    }
  }
  // Show any extra frontmatter keys the user has, alphabetical
  for (const key of Object.keys(parsed.frontmatter).sort()) {
    if (!seen.has(key)) {
      rows.push([key, parsed.frontmatter[key]])
    }
  }

  // Password row: always masked, with a length hint for the curious
  const passwordRow: [string, string] | null =
    parsed.password.length > 0 ? ["password", `•••••••• (${parsed.password.length} chars)`] : null

  if (passwordRow) rows.push(passwordRow)

  if (rows.length === 0) {
    return (
      <Text color={theme.overlay} dimColor>
        (no frontmatter)
      </Text>
    )
  }

  const labelWidth = Math.max(...rows.map(([k]) => k.length))

  return (
    <Box flexDirection="column">
      {rows.map(([key, value]) => (
        <Text key={key}>
          <Text color={theme.overlay}>{key.padEnd(labelWidth)} </Text>
          <Text color={theme.subtext}>{value}</Text>
        </Text>
      ))}
    </Box>
  )
}

/** Footer hint in the collapsed state. */
function Hint() {
  return (
    <Box marginTop={1}>
      <Text color={theme.overlay} dimColor>
        Press <Text color={theme.yellow}>p</Text> to reveal password
      </Text>
    </Box>
  )
}

/** Full body view, shown when revealed. The password line is bold. */
function BodyView({ parsed }: { parsed: ParsedEntry }) {
  const lines = parsed.body.split("\n")
  const truncated = lines.length > MAX_LINES
  const shown = truncated ? lines.slice(0, MAX_LINES) : lines

  return (
    <Box flexDirection="column" marginTop={1}>
      {shown.map((line, i) => (
        <Text
          key={i}
          color={line.startsWith("#") ? theme.subtext : theme.text}
          bold={line === parsed.password}
        >
          {line}
        </Text>
      ))}
      {truncated && (
        <Text color={theme.overlay} dimColor>
          … ({lines.length - MAX_LINES} more lines)
        </Text>
      )}
      <Box marginTop={1}>
        <Text color={theme.overlay} dimColor>
          Press <Text color={theme.yellow}>p</Text> or <Text color={theme.yellow}>Esc</Text> to hide
        </Text>
      </Box>
    </Box>
  )
}
