import React from "react"
import { Box, Text } from "ink"
import type { Toast as ToastT } from "../types/entry.js"
import { theme } from "../utils/theme.js"

interface Props {
  toast: ToastT | null
  width: number
}

/**
 * Transient status message. Lives at the bottom, above the help bar.
 * Renders nothing when no toast is set so it doesn't reserve space.
 */
export function Toast({ toast, width }: Props) {
  if (!toast) return null

  const color =
    toast.kind === "success" ? theme.green : toast.kind === "error" ? theme.red : theme.blue

  return (
    <Box paddingX={1} width={width}>
      <Text color={color}>{toast.text}</Text>
    </Box>
  )
}
