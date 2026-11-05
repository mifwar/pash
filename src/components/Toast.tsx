import React from "react"
import { Text } from "ink"
import type { Toast as ToastT } from "../types/entry.js"
import { theme } from "../utils/theme.js"

const STYLE = {
  success: { icon: "✓", color: theme.green },
  error: { icon: "✗", color: theme.red },
  info: { icon: "•", color: theme.blue },
} as const

/** Transient status message, shown at the right of the footer. */
export function Toast({ toast }: { toast: ToastT | null }) {
  if (!toast) return null
  const { icon, color } = STYLE[toast.kind]
  return (
    <Text color={color} wrap="truncate">
      {icon} {toast.text}
    </Text>
  )
}
