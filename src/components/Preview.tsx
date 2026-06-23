import React from "react"
import { Box, Text } from "ink"
import type { ParsedEntry } from "../utils/pass.js"
import { theme } from "../utils/theme.js"

interface Props {
  entryPath: string | null
  parsed: ParsedEntry | null
  expanded: boolean
  loading: boolean
  error: string | null
}

/**
 * Right-pane preview. Two modes:
 *
 * - **Collapsed (default):** show entry path + non-secret frontmatter
 *   (login, url, email, etc.) with the password masked as `••••••••`.
 *   This is the disambiguation view — no plaintext on screen.
 * - **Expanded (`p` toggled):** show the full decrypted body with a
 *   visible "PREVIEW" chip and a red-tinted border so it's always
 *   obvious the secret is on screen.
 *
 * The body is loaded lazily on selection (gated by `parsed !== null`)
 * but only rendered when `expanded` is true. This means the GPG agent
 * hit happens on every selection either way, but the *display* of
 * plaintext requires an explicit user action.
 *
 * Caps body output at 30 lines so a giant entry doesn't blow up the
 * layout.
 */
const MAX_LINES = 30

const FRONTMATTER_ORDER = ["login", "url", "email", "otpauth", "notes"] as const

export function Preview({ entryPath, parsed, expanded, loading, error }: Props) {
  if (!entryPath) {
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

  const borderColor = expanded ? theme.red : theme.surface1

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={borderColor}
      paddingX={1}
      flexGrow={1}
    >
      <Box marginBottom={1}>
        <Text color={theme.lavender} bold>
          {entryPath}
        </Text>
        {expanded && (
          <Text color={theme.red} bold>
            {" "}
            · PREVIEW
          </Text>
        )}
      </Box>

      {loading && (
        <Text color={theme.overlay} dimColor>
          Loading…
        </Text>
      )}

      {error && !loading && <Text color={theme.red}>{error}</Text>}

      {parsed && !loading && !error && (
        <Box flexDirection="column">
          <Metadata parsed={parsed} />
          {expanded ? <BodyView body={parsed.body} /> : <Hint />}
        </Box>
      )}

      {!parsed && !loading && !error && (
        <Text color={theme.overlay} dimColor>
          (no data)
        </Text>
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

/** Full body view, used when expanded. */
function BodyView({ body }: { body: string }) {
  const lines = body.split("\n")
  const truncated = lines.length > MAX_LINES
  const shown = truncated ? lines.slice(0, MAX_LINES) : lines

  return (
    <Box flexDirection="column" marginTop={1}>
      {shown.map((line, i) => {
        // Frontmatter lines: dim, with the `#` retained
        if (/^#\s+\w+:/.test(line)) {
          return (
            <Text key={i} color={theme.subtext}>
              {line}
            </Text>
          )
        }
        // The password line: bold and bright so it stands out
        if (i === 0 || (i > 0 && !/^#/.test(shown[i - 1] ?? ""))) {
          return (
            <Text key={i} color={theme.text} bold={!line.startsWith("#")}>
              {line}
            </Text>
          )
        }
        return (
          <Text key={i} color={theme.text}>
            {line}
          </Text>
        )
      })}
      {truncated && (
        <Text color={theme.overlay} dimColor>
          … ({lines.length - MAX_LINES} more lines)
        </Text>
      )}
      <Box marginTop={1}>
        <Text color={theme.overlay} dimColor>
          Press <Text color={theme.yellow}>p</Text> to hide
        </Text>
      </Box>
    </Box>
  )
}
