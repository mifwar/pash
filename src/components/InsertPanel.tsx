import React, { useReducer, useRef } from "react"
import { Box, Text, useInput } from "ink"
import { editLine, keyName } from "../keymap.js"
import {
  DEFAULT_PASSWORD_RULES,
  PASSWORD_TOGGLES,
  adjustPasswordLength,
  generatePassword,
  togglePasswordRule,
  type PasswordRules,
} from "../utils/password.js"
import { theme } from "../utils/theme.js"

export type InsertMethod = "generate" | "manual"

export interface InsertState {
  step: "path" | "method"
  path: string
  method: InsertMethod
  /** 0 = length, 1..PASSWORD_TOGGLES.length = toggles, last = custom exclude chars. */
  ruleIndex: number
  rules: PasswordRules
  manualPassword: string
  showManualPassword: boolean
}

export type InsertAction =
  | { type: "path"; value: string }
  | { type: "step"; step: InsertState["step"] }
  | { type: "toggle-method" }
  | { type: "move-rule"; delta: number }
  | { type: "length"; delta: number }
  | { type: "toggle-rule" }
  | { type: "exclude-chars"; value: string }
  | { type: "manual-password"; value: string }
  | { type: "toggle-visibility" }

export const initialInsertState: InsertState = {
  step: "path",
  path: "",
  method: "generate",
  ruleIndex: 0,
  rules: DEFAULT_PASSWORD_RULES,
  manualPassword: "",
  showManualPassword: false,
}

const EXCLUDE_ROW_INDEX = 1 + PASSWORD_TOGGLES.length
const RULE_ROW_COUNT = EXCLUDE_ROW_INDEX + 1

export function insertReducer(state: InsertState, action: InsertAction): InsertState {
  switch (action.type) {
    case "path":
      return { ...state, path: action.value }
    case "step":
      return { ...state, step: action.step }
    case "toggle-method":
      return { ...state, method: state.method === "generate" ? "manual" : "generate" }
    case "move-rule": {
      const ruleIndex = Math.min(RULE_ROW_COUNT - 1, Math.max(0, state.ruleIndex + action.delta))
      return ruleIndex === state.ruleIndex ? state : { ...state, ruleIndex }
    }
    case "length": {
      const rules = adjustPasswordLength(state.rules, action.delta)
      return rules === state.rules ? state : { ...state, rules }
    }
    case "toggle-rule": {
      const toggle = PASSWORD_TOGGLES[state.ruleIndex - 1]
      if (!toggle) return state
      const rules = togglePasswordRule(state.rules, toggle.key)
      return rules === state.rules ? state : { ...state, rules }
    }
    case "exclude-chars":
      return { ...state, rules: { ...state.rules, excludeChars: action.value } }
    case "manual-password":
      return { ...state, manualPassword: action.value }
    case "toggle-visibility":
      return { ...state, showManualPassword: !state.showManualPassword }
  }
}

interface Props {
  height: number
  hasEntry: (path: string) => boolean
  onSubmit: (path: string, password: string, method: InsertMethod) => Promise<void>
  onCancel: () => void
  onError: (message: string) => void
}

/**
 * Self-contained right-pane wizard for inserting a new entry:
 *   1. Path
 *   2. Auto-generate (with configurable rules) or Manual password entry
 */
export const InsertPanel = React.memo(function InsertPanel({
  height,
  hasEntry,
  onSubmit,
  onCancel,
  onError,
}: Props) {
  const [state, dispatch] = useReducer(insertReducer, initialInsertState)
  const submitting = useRef(false)

  const submit = () => {
    if (submitting.current) return
    const path = state.path.trim()
    if (state.method === "manual" && !state.manualPassword) {
      onError("Password must be non-empty")
      return
    }
    let password: string
    try {
      password = state.method === "generate" ? generatePassword(state.rules) : state.manualPassword
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
      return
    }
    submitting.current = true
    onSubmit(path, password, state.method).finally(() => {
      submitting.current = false
    })
  }

  useInput((input, key) => {
    const name = keyName(input, key)
    if (state.step === "path") {
      if (name === "esc") return onCancel()
      if (name === "enter") {
        const path = state.path.trim()
        if (!path || /\s/.test(path)) {
          onError("Path must be non-empty with no whitespace")
          return
        }
        if (hasEntry(path)) {
          onError(`${path} already exists (press e to edit)`)
          return
        }
        dispatch({ type: "path", value: path })
        dispatch({ type: "step", step: "method" })
        return
      }
      const value = editLine(state.path, input, key)
      if (value !== null) dispatch({ type: "path", value })
      return
    }

    if (name === "esc") return dispatch({ type: "step", step: "path" })
    if (name === "tab") return dispatch({ type: "toggle-method" })
    if (name === "enter") return submit()

    if (state.method === "generate") {
      if (state.ruleIndex === EXCLUDE_ROW_INDEX) {
        if (name === "up") return dispatch({ type: "move-rule", delta: -1 })
        const value = editLine(state.rules.excludeChars, input, key)
        if (value !== null) dispatch({ type: "exclude-chars", value })
        return
      }
      if (name === "down" || name === "j") return dispatch({ type: "move-rule", delta: 1 })
      if (name === "up" || name === "k") return dispatch({ type: "move-rule", delta: -1 })
      if (state.ruleIndex === 0) {
        if (name === "left" || name === "h" || name === "-")
          return dispatch({ type: "length", delta: -1 })
        if (name === "right" || name === "l" || name === "+" || name === "=")
          return dispatch({ type: "length", delta: 1 })
        if (name === "H") return dispatch({ type: "length", delta: -4 })
        if (name === "L") return dispatch({ type: "length", delta: 4 })
      } else if (
        name === " " ||
        name === "left" ||
        name === "right" ||
        name === "h" ||
        name === "l"
      ) {
        dispatch({ type: "toggle-rule" })
      }
      return
    }

    if (name === "ctrl-r") return dispatch({ type: "toggle-visibility" })
    const value = editLine(state.manualPassword, input, key)
    if (value !== null) dispatch({ type: "manual-password", value })
  })

  const plaintextVisible =
    state.step === "method" && state.method === "manual" && state.showManualPassword

  return (
    <Box
      flexDirection="column"
      height={height}
      overflow="hidden"
      borderStyle="single"
      borderTop={false}
      borderRight={false}
      borderBottom={false}
      borderColor={plaintextVisible ? theme.red : theme.green}
      paddingLeft={2}
      flexGrow={1}
    >
      <Box marginBottom={1}>
        <Text>
          <Text color={theme.green} bold>
            New entry
          </Text>
          {state.step === "method" && <Text color={theme.lavender}> {state.path}</Text>}
          {plaintextVisible && <Text color={theme.red}> ● plaintext visible</Text>}
        </Text>
      </Box>

      {state.step === "path" ? (
        <Box flexDirection="column">
          <Text wrap="truncate">
            <Text color={theme.overlay}>{"Path".padEnd(14)}</Text>
            <Text color={theme.yellow}>{state.path}</Text>
            <Text color={theme.yellow}>▌</Text>
          </Text>
          <Box marginTop={1}>
            <Text color={theme.overlay} dimColor>
              e.g. email/work or cloud/aws/prod
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text color={theme.overlay} dimColor>
              Press Enter to choose auto-generate or manual password.
            </Text>
          </Box>
        </Box>
      ) : (
        <Box flexDirection="column">
          <ModeSelector method={state.method} />
          <Box marginTop={1} flexDirection="column">
            {state.method === "generate" ? (
              <RulesList rules={state.rules} ruleIndex={state.ruleIndex} />
            ) : (
              <ManualInput password={state.manualPassword} visible={state.showManualPassword} />
            )}
          </Box>
        </Box>
      )}
    </Box>
  )
})

function ModeSelector({ method }: { method: InsertMethod }) {
  const genActive = method === "generate"
  return (
    <Text wrap="truncate">
      <Text color={theme.overlay}>{"Mode".padEnd(14)}</Text>
      <Text
        color={genActive ? theme.green : theme.overlay}
        backgroundColor={genActive ? theme.surface0 : undefined}
        bold={genActive}
      >
        {" Auto-generate "}
      </Text>
      <Text>{"  "}</Text>
      <Text
        color={!genActive ? theme.peach : theme.overlay}
        backgroundColor={!genActive ? theme.surface0 : undefined}
        bold={!genActive}
      >
        {" Manual "}
      </Text>
      <Text color={theme.overlay} dimColor>
        {"  (Tab)"}
      </Text>
    </Text>
  )
}

function RulesList({ rules, ruleIndex }: { rules: PasswordRules; ruleIndex: number }) {
  const excludeFocused = ruleIndex === EXCLUDE_ROW_INDEX
  const rows = [
    {
      label: "Length",
      value: `◀ ${String(rules.length).padStart(2)} ▶`,
      hint: "←/→ ±1 · H/L ±4",
    },
    ...PASSWORD_TOGGLES.map((t) => ({
      label: t.label,
      value: rules[t.key] ? "[x]" : "[ ]",
      hint: t.hint,
    })),
    {
      label: "Exclude",
      value: excludeFocused ? `${rules.excludeChars}▌` : rules.excludeChars || "(none)",
      hint: excludeFocused ? "type chars · ↑/↓ move" : "custom chars to omit",
    },
  ]

  return (
    <Box flexDirection="column">
      {rows.map((row, i) => {
        const focused = i === ruleIndex
        const bg = focused ? theme.surface0 : undefined
        return (
          <Text key={row.label} wrap="truncate">
            <Text color={theme.green} backgroundColor={bg}>
              {focused ? "▌ " : "  "}
            </Text>
            <Text color={focused ? theme.text : theme.subtext} bold={focused} backgroundColor={bg}>
              {row.label.padEnd(16)}
            </Text>
            <Text
              color={focused ? theme.yellow : theme.lavender}
              bold={focused}
              backgroundColor={bg}
            >
              {row.value}
            </Text>
            <Text color={theme.overlay} backgroundColor={bg}>
              {`  ${row.hint} `}
            </Text>
          </Text>
        )
      })}
    </Box>
  )
}

function ManualInput({ password, visible }: { password: string; visible: boolean }) {
  const shown = visible ? password : "•".repeat(password.length)
  return (
    <Box flexDirection="column">
      <Text wrap="truncate">
        <Text color={theme.overlay}>{"Password".padEnd(14)}</Text>
        <Text color={visible ? theme.red : theme.yellow}>{shown}</Text>
        <Text color={theme.yellow}>▌</Text>
      </Text>
      <Box marginTop={1}>
        <Text color={theme.overlay} dimColor>
          Type or paste your password. Ctrl-r to {visible ? "hide" : "show"}.
        </Text>
      </Box>
    </Box>
  )
}
